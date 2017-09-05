import { h, render } from 'preact';
import * as Mixer from '@mcph/miix-std';

import { PreactScene, PreactStage } from './alchemy/preact/index';
import { Joystick } from './joystick';
import { Button } from './button';

// Import our custom CSS.
require('./style.scss');

// The registry contains a list of all your custom scenes and buttons. You
// should pass them in here so that we're aware of them!
const registry = new Mixer.Registry().register(Button, Joystick, PreactScene);

// Do the thing!
render(<PreactStage registry={registry} />, document.querySelector('#app'));
