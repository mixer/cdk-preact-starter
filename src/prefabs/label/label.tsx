/*******************
 * Label
 * *****************/
import * as Mixer from '@mixer/cdk-std';
import { h } from 'preact';
import { PreactControl } from '../../alchemy/preact';
import { blockRule } from '../../alchemy/Style';

import './label.scss';

@Mixer.Control({ kind: 'label' })
export class Label extends PreactControl {
  /**
   * The text in the label.
   */
  @Mixer.Input() public text: string;

  /**
   * The text size in the label.
   */
  @Mixer.Input() public textSize: string;

  /**
   * The text color of the label.
   */
  @Mixer.Input({ kind: Mixer.InputKind.Color })
  public textColor: string;

  /**
   * Is the text of the label underlined?
   */
  @Mixer.Input() public underline: boolean;

  /**
   * Is the text of the label bold?
   */
  @Mixer.Input() public bold: boolean;

  /**
   * Is the text of the label italics?
   */
  @Mixer.Input() public italic: boolean;

  public render() {
    const { controlID } = this.props;
    return (
      <div key={`control-${controlID}`} class="mixer-label-container" name={`control-${controlID}`}>
        {this.renderCustomStyleBlock()}
        <div class="mixer-label">{this.text}</div>
      </div>
    );
  }

  private renderCustomStyleBlock = () => {
    const { controlID } = this.props;
    return (
      <style>
        {// Custom border color for the button.
        blockRule(controlID, '.mixer-label', {
          fontSize: this.textSize,
          color: this.textColor,
          textDecoration: this.underline ? 'underline' : null,
          fontWeight: this.bold ? '600' : null,
          fontStyle: this.italic ? 'italic' : null,
        })}
      </style>
    );
  };
}
