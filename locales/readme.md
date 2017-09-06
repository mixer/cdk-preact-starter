# Locales

Mixer Interactive provides built-in support to internationalize your application. In this folder are many different JSON files corresponding to locales. The general form for what a locale string "is" is formally defined in [BCP47](http://www.ietf.org/rfc/bcp/bcp47.txt) but, for the most part, they take the form of `language-dialect`, such as `en-US`. The JSON file names correspond to these locales, and we'll automatically load the most specific locale we can when the user loads the page.

In your controls you can use the [`<Translate />`](https://github.com/mixer/interactive-launchpad/blob/master/src/alchemy/preact/Translate.tsx) component to insert a translated string. For example if my JSON files contain something like `{"clickMe":"Click me!"}`, I can write:

```tsx
export class MyControl extends PreactControl {

  // ...

  public render() {
      return <button onmousedown={this.clicked}><Translate string="clickMe" /></button>
  }

  // ...

}
```

Internally, we use Format.js with the [ICU MessageFormat](hhttps://formatjs.io/guides/message-syntax/) which provides good support for pluralization, dates, ordinals, and more. (The official ICU spec is [here](http://userguide.icu-project.org/formatparse/messages).)

> Tip: the files are actually parsed as [JSON5](https://github.com/json5/json5#example), so you can add comments, muliline strings, and more!

For example, to interpolate a number of Things using [plural formatting](https://formatjs.io/guides/message-syntax/#plural-format):

```json5
{
  countThings: "There are {count, plural, \
    =0 {no Things} \
    =1 {one Thing} \
    =2 {a couple Things} \
    other {# Things}}"
}
```

Successive whitespaces and new lines in the translation file are ignored.
