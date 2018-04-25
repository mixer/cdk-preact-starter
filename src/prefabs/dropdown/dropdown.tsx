/*******************
 * Participant Selection
 * *****************/
import * as Mixer from '@mcph/miix-std';
import { h } from 'preact';
import { PreactControl } from '../../alchemy/preact';
import { classes } from '../../alchemy/Style';

import '../button/button.scss';
import './dropdown.scss';

type option = {
  value: any,
  label: any,
}

@Mixer.Control({ kind: 'dropdown' })
export class Dropdown extends PreactControl<{
  hasSubmitted: boolean;
  selected: option;
}> {

  /**
   * Whether input is disabled.
   */
  @Mixer.Input() public disabled: boolean;

  /**
   * Label for button.
   */
  @Mixer.Input() public buttonLabel: string;

  /**
   * Label for button after submit
   */
  @Mixer.Input() public buttonSentLabel: string;

  /**
   * Default selection index.
   */
  @Mixer.Input() public defaultSelection: number = 0;

  /**
   * Options for dropdown.
   */
  @Mixer.Input({ kind: Mixer.InputKind.Array }) public options: option[];

  private listVisible: boolean;

  public componentWillMount() {
    this.toggleDropdown = this.toggleDropdown.bind(this);
    this.selectValue = this.selectValue.bind(this);

    this.setState({
      ...this.state,
      selected: this.options ? this.options[this.defaultSelection] : null,
      hasSubmitted: false,
    });
  }

  public selectValue = (selection: option) => {
    if (!this.disabled) {
      this.setState({ ...this.state, selected: selection });
      this.toggleDropdown();
    }
  }

  public sendSelection = () => {
    console.log('sending selection', this.state.selected);
  }

  public toggleDropdown = () => {
    this.listVisible = !this.listVisible;
  }

  public render() {
    let options;
    if (this.options) {
      options = this.options.map((_option: option) => {
          return (
            <div
              role="button"
              class={classes({selected: this.state.selected === _option})}
              key={_option.value}
              value={_option.value}
              // tslint:disable-next-line:react-this-binding-issue
              onClick={() => this.selectValue(_option)}>
                <span>{_option.label}</span>
            </div>
          )
      })
    } else {
      return (
        <div>There are no options</div>
      )
    }

    return (
      <div class="dropdown-wrapper">
        <div class={classes({dropdownContainer: true, show: this.listVisible})}>
          <div role="button" class={classes({dropdownDisplay: true, clicked: this.listVisible})} onClick={this.toggleDropdown}>
            {
              !this.state.selected &&
              <span><i class={classes({chevronDown: this.listVisible, chevronUp: !this.listVisible})}>&gt;</i></span>
            }
            {
              this.state.selected &&
              <span>{ this.state.selected.label }</span>
            }
          </div>
          <div class={classes({dropdownList: true, show: this.listVisible})}>
            <div>
              {options}
            </div>
          </div>
        </div>
        <div role="button" class={classes({mixerButton: true, disabled: this.state.hasSubmitted})} onClick={this.sendSelection}>
          { !this.state.hasSubmitted && this.buttonLabel }
          { this.state.hasSubmitted && this.buttonSentLabel }
        </div>
      </div>
    );
  }
}
