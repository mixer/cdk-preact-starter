/*******************
 * TextBox
 * *****************/
import * as Mixer from '@mcph/miix-std';
import { Component, h } from 'preact';
import { PreactControl } from '../../alchemy/preact';
import { classes } from '../../alchemy/Style';

import '../button/button.scss';
import './textbox.scss';

@Mixer.Control({ kind: 'textbox', dimensions: [{ property: 'height', minimum: 4 }] })
export class TextBox extends PreactControl {
  /**
   * Whether the input and/or submit button is disabled on the textbox.
   */
  @Mixer.Input() public disabled: boolean;

  /**
   * Whether the input allows for one line or multiple lines of text.
   */
  @Mixer.Input() public multiline: boolean;

  /**
   * The placeholder (text hint) for the textbox.
   */
  @Mixer.Input() public placeholder: string;

  /**
   * Whether the input has a submit button or not.
   */
  @Mixer.Input() public hasSubmit: boolean;

  /**
   * The text of the optional submit button.
   */
  @Mixer.Input() public submitText: string;

  private hasFocus: boolean;
  private refInput: Input;

  public constructor(props: any) {
    super(props);
  };

  public render() {
    const { controlID } = this.props;
    const classContainer = classes({
      mixerTextboxContainer: true,
      compact: this.isCompactMode()
    })
    const classNames = `mixer-textbox${this.hasFocus ? " mixer-has-focus" : ""}`;
    return (
        <div key={`control-${controlID}`} class={classContainer} name={`control-${controlID}`}>
          <Input class={classNames}
            ref={this.setReference}
            placeholder={this.placeholder}
            multiline={this.multiline}
            onClick={this.handleClick}
            onKeyPress={this.handleKeyPress}
            onBlur={this.handleBlur} />
          <Button submitText={this.submitText} hasSubmit={this.hasSubmit} onClick={this.sendText}  disabled={this.disabled} />
        </div>
      );
  };

  protected setReference = (input: Input) => {
    this.refInput = input;
  }

  protected handleClick = (evt: PointerEvent) => {
    this.hasFocus = true;
    this.forceUpdate();
  };

  protected handleBlur = (evt: PointerEvent) => {
    this.hasFocus = false;
    this.forceUpdate();
  };

  protected handleKeyPress = (evt: KeyboardEvent) => {
    // Do we send both events on Enter?
    if (!this.hasSubmit) {
      const target = evt.target as HTMLInputElement;
      console.log('change:', target.value);
      this.control.giveInput({ event: 'change', value: target.value })
    }
    if (evt.keyCode === 13 && !this.multiline) {
      this.sendText();
    }
  }

  private sendText = (evt?: MouseEvent) => {
    if (evt && !this.hasSubmit) {
      return;
    }
    const target = this.refInput.base as HTMLInputElement;
    console.log('submit:', target.value);
    this.control.giveInput({ event: 'submit', value: target.value });
  }

  private isCompactMode = (): boolean => {
    const grid = Mixer.Layout.gridLayouts[this.props.resource.grid].size;
    const gridPlacement = this.props.position.find(gplace => gplace.size === grid);
    return !(!gridPlacement || gridPlacement.height >= 7);
  }
}

class Input extends Component<any, any> {
  public render() {
    if (this.props.multiline) {
      return <textarea {...this.props} />
    } else {
      return <input type='text' {...this.props} />
    }
  }
}

class Button extends Component<any, any> {
  public render() {
    if (this.props.hasSubmit) {
      return (
        <div
          class={classes({ mixerButton: true })}
          disabled={this.props.disabled}
          role="button"
          onClick={this.props.onClick}
        >
          <div class="mixer-content">{this.props.submitText || 'Submit'}</div>
      </div>
      )
    } else {
      return null;
    }
  }
}
