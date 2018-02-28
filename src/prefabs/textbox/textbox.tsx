/*******************
 * TextBox
 * *****************/
import * as Mixer from '@mcph/miix-std';
import { Component, h } from 'preact';
import { CoolDown, PreactControl, SparkPill } from '../../alchemy/preact';
import { classes } from '../../alchemy/Style';

import '../button/button.scss';
import './textbox.scss';

@Mixer.Control({
  kind: 'textbox',
  dimensions: [{ property: 'height', minimum: 4 }],
})
export class TextBox extends PreactControl<{
  availableSparks: number;
  active: boolean;
  cooldown: boolean;
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
    this.control.state.participant.removeListener(
      'update',
      this.updateAvailableSparks,
    );
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
      >
        <Input
          class={textboxClasses}
          ref={this.setReference}
          placeholder={this.placeholder}
          multiline={this.multiline}
          onClick={this.handleClick}
          onKeyPress={this.handleKeyPress}
          onBlur={this.handleBlur}
          disabled={this.disabled || this.state.cooldown}
        />
        {!this.hasSubmit
          ? [
              <SparkPill
                cost={this.cost}
                available={this.state.availableSparks}
              />,
              <CoolDown
                cooldown={this.cooldown}
                onCooldownEnd={this.endCooldown}
              />,
            ]
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

  protected handleKeyPress = (evt: KeyboardEvent) => {
    const target = evt.target as HTMLInputElement;
    if (!this.multiline && !this.hasSubmit) {
      console.log('change:', target.value);
      this.control.giveInput({ event: 'change', value: target.value });
    }
    if ((evt.keyCode === 13 && !this.multiline) || evt.keyCode === 10) {
      this.sendText();
    }
  };

  protected sendText = (evt?: MouseEvent) => {
    if (evt && !this.hasSubmit) {
      return;
    }
    const target = this.refInput.base as HTMLInputElement;
    console.log('submit:', target.value);
    this.control.giveInput({ event: 'submit', value: target.value });
  };

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
    const gridPlacement = this.props.position.find(
      gplace => gplace.size === grid,
    );
    return !(!gridPlacement || gridPlacement.height >= 7);
  };

  private isCompactWidth = (): boolean => {
    const grid = Mixer.Layout.gridLayouts[this.props.resource.grid].size;
    const gridPlacement = this.props.position.find(
      gplace => gplace.size === grid,
    );
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
    if (this.props.hasSubmit) {
      return (
        <button
          class={classes({ mixerButton: true, compact: this.props.compact })}
          disabled={this.props.disabled}
          role="button"
          onClick={this.props.onClick}
        >
          <div class="state" />
          <div
            class={classes({
              mixerButtonContent: true,
              cooldown: this.props.cooldown,
            })}
          >
            <div class="mixer-button-text">
              {this.props.submitText || 'Submit'}
            </div>
          <SparkPill
            cost={this.props.cost}
            available={this.props.availableSparks}
          />
          </div>
          <CoolDown
            cooldown={this.props.cooldown}
            onCooldownEnd={this.props.endCooldown}
            hideTime={this.props.isCompactWidth}
          />
        </button>
      );
    } else {
      return null;
    }
  }
}
