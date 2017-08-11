import { Component, h, render } from 'preact';

interface HelloWorldProps {
    name: string
}

class HelloWorld extends Component<any, any> {
    private canvas: Element;

    render (props) {
        return <canvas ref={c => this.canvas = c}></canvas>
    }

    public componentDidMount() {
        debugger;
    }
}

render(<HelloWorld name="World" />, document.querySelector('#app'));