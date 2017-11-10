import * as Mixer from '@mcph/miix-std';
import { h, render } from 'preact';

import { PreactStage } from './alchemy/preact/index';
import { Button as ButtonControl } from './button';
import { Joystick as JoystickControl } from './joystick';
import { DefaultScene } from './scene';

// Import our custom CSS.
require('./style.scss');

// The registry contains a list of all your custom scenes and buttons. You
// should pass them in here so that we're aware of them!
const registry = new Mixer.Registry().register(ButtonControl, JoystickControl, DefaultScene);

// Do the thing!
render(<PreactStage registry={registry} />, document.querySelector('#app'));
