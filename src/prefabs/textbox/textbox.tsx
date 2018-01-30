/*******************
 * TextBox
 * *****************/
import * as Mixer from '@mcph/miix-std';
import { Component, h } from 'preact';
import { PreactControl } from '../../alchemy/preact';
import { classes } from '../../alchemy/Style';

import '../button/button.scss';
import '../label/label.scss';
import './textbox.scss';

@Mixer.Control({ kind: 'textbox' })
export class TextBox extends PreactControl {
  /**
   * Size of the textbox.
   */
  @Mixer.Input() public dimensions: Mixer.IDimensions;

  @Mixer.Input() public multiline: boolean = false;

  @Mixer.Input() public defaultText: string;

  @Mixer.Input() public label: string = "";

  @Mixer.Input() public hasSubmit: boolean = false;

  private hasFocus: boolean;
  private refInput: Input;

  public constructor(props: any) {
    super(props);
  };

  public render() {
    const { controlID } = this.props;
    const classNames = `mixer-textbox${this.hasFocus ? " mixer-has-focus" : ""}`;
    return (
        <div class="mixer-textbox-container" name={`control-${controlID}`}>
          <Label text={this.label} />
          <Input class={classNames}
            ref={this.setReference}
            placeholder={this.defaultText}
            multiline={this.multiline}
            onClick={this.handleClick}
            onKeyPress={this.handleKeyPress}
            onBlur={this.handleBlur} />
          <Button onClick={this.sendText} />
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
      this.control.giveInput({ event: 'keypress', value: target.value })
    }
    if (evt.keyCode === 13 && !this.multiline) {
      this.sendText();
    }
  }

  private sendText = () => {
    const target = this.refInput.base as HTMLInputElement;
    this.control.giveInput({ event: 'submit', value: target.value });
  };
}

class Label extends Component<any, any> {
  public render() {
    if (this.props.text) {
      return (
        <div class="mixer-label-container">
          <div class="mixer-label">{this.props.text}</div>
        </div>
      )
    } else {
      return null
    }
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
    return (
      <div
        class={classes({ mixerButton: true, active: this.state.active })}
        disabled={this.props.disabled}
        role="button"
        onClick={this.props.onClick}
      >
        <div class="mixer-content">Submit</div>
    </div>
    )
  }
}
