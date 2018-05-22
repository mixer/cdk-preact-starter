/*******************
 * TextBox
 * *****************/
import * as Mixer from '@mixer/cdk-std';
import { Component, h } from 'preact';

import { CoolDown, PreactControl, SparkPill } from '../../alchemy/preact';
import { classes } from '../../alchemy/Style';

import '../button/button.scss';
import './textbox.scss';

@Mixer.Control({
  kind: 'textbox',
  dimensions: [{ property: 'height', minimum: 4 }, { property: 'width', minimum: 10 }],
})
export class TextBox extends PreactControl<{
  availableSparks: number;
  active: boolean;
  cooldown: boolean;
  inputValue: string;
}> {
  /**
   * Whether the input and/or submit button is disabled on the textbox.
   */
  @Mixer.Input() public disabled: boolean;

  /**
   * Whether the text input is multiline.
   */
  @Mixer.Input() public multiline: boolean;

  /**
   * The placeholder (hint) text for the textbox.
   */
  @Mixer.Input() public placeholder: string;

  /**
   * Whether the textbox has a submit button.
   */
  @Mixer.Input() public hasSubmit: boolean;

  /**
   * The text of the optional submit button.
   */
  @Mixer.Input() public submitText: string;

  /**
   * The spark cost to submit the text.
   */
  @Mixer.Input() public cost: number;

  /**
   * A unix milliseconds timestamp until which this button should be
   * in a "cooldown" state.
   */
  @Mixer.Input() public cooldown: number;

  private hasFocus: boolean;
  private refInput: Input;

  public componentWillMount() {
    this.updateAvailableSparks();
    this.control.state.participant.on('update', this.updateAvailableSparks);
    this.setState({
      ...this.state,
      cooldown: this.cooldown - Date.now() > 0,
    });
  }

  public componentWillReceiveProps() {
    this.setState({
      ...this.state,
      cooldown: this.cooldown - Date.now() > 0,
    });
  }

  public componentWillUnmount() {
    this.control.state.participant.removeListener('update', this.updateAvailableSparks);
  }
  public render() {
    const { controlID } = this.props;
    const classContainer = classes({
      mixerTextboxContainer: true,
      compact: this.isCompactHeight(),
      hasCost: !!this.cost,
    });
    const textboxClasses = classes({
      mixerTextbox: true,
      mixerHasFocus: this.hasFocus,
    });
    return (
      <div
        key={`control-${controlID}`}
        class={classContainer}
        name={`control-${controlID}`}
        tabIndex={-1}
      >
        <Input
          type="search"
          class={textboxClasses}
          ref={this.setReference}
          placeholder={this.placeholder}
          multiline={this.multiline}
          onClick={this.handleClick}
          onInput={this.handleChange}
          onBlur={this.handleBlur}
          disabled={this.disabled || this.state.cooldown}
          onKeyPress={this.keypress}
          tabIndex={0}
          value={this.state.inputValue}
        />
        <div
           class={classes({
             clearText: true,
             disabled: !this.state.inputValue,
           })}
           onClick={this.reset}>x</div>
        {!this.hasSubmit && !this.cost
          ? [<CoolDown cooldown={this.cooldown} onCooldownEnd={this.endCooldown} />]
          : null}
        <Button
          submitText={this.submitText}
          hasSubmit={this.hasSubmit}
          onClick={this.sendText}
          disabled={this.disabled || this.state.cooldown}
          cooldown={this.cooldown}
          endCooldown={this.endCooldown}
          cost={this.cost}
          availableSparks={this.state.availableSparks}
          compact={this.isCompactHeight()}
          isCompactWidth={this.isCompactWidth}
        />
      </div>
    );
  }

  protected setReference = (input: Input) => {
    this.refInput = input;
  };

  protected handleClick = (evt: PointerEvent) => {
    this.hasFocus = true;
    this.forceUpdate();
  };

  protected handleBlur = (evt: PointerEvent) => {
    this.hasFocus = false;
    this.forceUpdate();
  };

  protected handleChange = (evt: any) => {
    this.setState({
      ...this.state,
      inputValue: evt.target.value,
    });

    if (!this.multiline && !this.hasSubmit && !this.cost) {
      this.control.giveInput({ event: 'change', value: this.state.inputValue });
    }
  };

  protected keypress = (evt: KeyboardEvent) => {
    if ((evt.keyCode === 13 && !this.multiline) || evt.keyCode === 10) {
      this.sendText();
    }
  };

  protected sendText = (evt?: MouseEvent) => {
    if (evt && !this.hasSubmit && !this.cost) {
      return;
    }

    if (!this.state.inputValue) {
      return;
    }

    this.control.giveInput({ event: 'submit', value: this.state.inputValue });
    this.reset();
  };

  protected reset = () => {
    this.setState({
      ...this.state,
      inputValue: '',
    })
  }

  private updateAvailableSparks = () => {
    this.setState({
      ...this.state,
      availableSparks: this.control.state.participant.props.sparks,
    });
  };

  private endCooldown = () => {
    this.setState({
      ...this.state,
      cooldown: false,
    });
  };

  private isCompactHeight = (): boolean => {
    const grid = Mixer.Layout.gridLayouts[this.props.resource.grid].size;
    const gridPlacement = this.props.position.find(gplace => gplace.size === grid);
    return !(!gridPlacement || gridPlacement.height >= 7);
  };

  private isCompactWidth = (): boolean => {
    const grid = Mixer.Layout.gridLayouts[this.props.resource.grid].size;
    const gridPlacement = this.props.position.find(gplace => gplace.size === grid);
    return !(!gridPlacement || gridPlacement.width >= 8);
  };
}

class Input extends Component<any, any> {
  public render() {
    if (this.props.multiline) {
      return <textarea {...this.props} />;
    } else {
      return <input type="text" {...this.props} />;
    }
  }
}

class Button extends Component<any, any> {
  public render() {
    if (this.props.hasSubmit || this.props.cost) {
      return (
        <div
          class={classes({ mixerButton: true, compact: this.props.compact })}
          disabled={this.props.disabled}
          role="button"
          onClick={this.props.onClick}
          tabIndex={0}
          onKeyDown={this.keydown}
        >
          <div class="state" />
          <div
            class={classes({
              mixerButtonContent: true,
              cooldown: this.props.cooldown,
            })}
          >
            <div class="mixer-button-text">{this.props.submitText || 'Submit'}</div>
            <SparkPill cost={this.props.cost} available={this.props.availableSparks} />
          </div>
          <CoolDown
            cooldown={this.props.cooldown}
            onCooldownEnd={this.props.endCooldown}
            hideTime={this.props.isCompactWidth}
          />
        </div>
      );
    } else {
      return null;
    }
  }

  protected keydown = (evt: KeyboardEvent) => {
    if (evt.keyCode === 13) {
      this.props.onClick();
    }
  };
}
