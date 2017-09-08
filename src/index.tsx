import * as Mixer from '@mcph/miix-std';
import { h, render } from 'preact';

import { Button, gamepad } from './alchemy/Gamepad';
import { PreactScene, PreactStage } from './alchemy/preact/index';
import { Button as ButtonControl } from './button';
import { Joystick as JoystickControl } from './joystick';

// Import our custom CSS.
require('./style.scss');

// The registry contains a list of all your custom scenes and buttons. You
// should pass them in here so that we're aware of them!
const registry = new Mixer.Registry().register(ButtonControl, JoystickControl, PreactScene);

// We can automatically translate Xbox controller input to keyboard inputs.
// You can configure these bindings here. Note that in controls you can
// can explicitly bind to a button or joystick, doing this will override
// these default bindings.
gamepad.bindJoysticks(true).bindButtons({
  [Button.Y]: 'W',
  [Button.X]: 'A',
  [Button.A]: 'S',
  [Button.B]: 'D',
  [Button.LeftBumper]: 'Q',
  [Button.LeftTrigger]: 'Q',
  [Button.RightBumper]: 'E',
  [Button.RightTrigger]: 'E',
  [Button.DPadUp]: 38,
  [Button.DPadRight]: 39,
  [Button.DPadDown]: 40,
  [Button.DPadLeft]: 41,
});

// Do the thing!
render(<PreactStage registry={registry} />, document.querySelector('#app'));
