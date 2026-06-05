# Silvermine Video.js Remote Playback Plugin

## What

A [Video.js][videojs] plugin that enables remote playback capabilities for casting video
content to Chromecast and AirPlay devices using [Remote Playback API][remoteplaybackapi].

## Why

Modern users expect seamless video experiences across all their devices. Whether they're
watching on a laptop and want to cast to their TV via Chromecast or Google TV Streamer, or
streaming from an iPhone to an Apple TV using AirPlay, remote playback has become an
essential feature for video applications.

While Video.js provides excellent video playback capabilities, it lacks built-in support
for casting to external devices. This plugin bridges that gap with the native
[Remote Playback API][remoteplaybackapi]. Whereas this API is not fully supported, it is
supported by Chrome and Edge on Android via casting, and Safari or [WebKit][webkit] on
both iOS and macOS via AirPlay. Optionally, this plugin supports using native AirPlay API
calls when on Safari or WebKit, which is guaranteed to be more compatible, although
support for Remote Playback API on Safari and WebKit by receiving devices is pretty good.

## Caveats

Notably lacking support for [Remote Playback API][remoteplaybackapi] currently is Chrome
for desktops (on both macOS and Windows). It *technically* supports the API, but never
reports any clients to cast to.

Firefox for desktops has not supported video streaming in the past, and it still does not
in the case of Remote Playback API.

Since Firefox and Chrome for iOS both technically use WebKit under the hood, these
browsers support Remote Playback API via AirPlay on iOS.

## How do I use it?

The `@silvermine/videojs-remoteplayback` plugin provides JavaScript and CSS assets. It
provides AirPlay/casting icons embedded in the CSS.

### Building Locally

   1. Clone this repository and run `npm install`.
   2. Run `npm run dev`, to test the plugin against the sample app instance in the
      `examples` folder.
   3. Build the plugin into a `dist` folder with `npm run build`.

### Building in your own project

Install it with `npm install @silvermine/videojs-remoteplayback`. Ensure its peer
dependencies are installed, namely, [Video.js][videojs]. Configure it according to the
configuration instructions below.

### Configuration

Once the plugin has been loaded and registered, add it to your Video.js player using
Video.js' plugin configuration option (see "[Setting up a Plugin][videojs-plugin-setup]"
on the Video.js docs). Use these options to configure the plugin:

   * **`plugins.remotePlayback.addButtonToControlBar`**: A `boolean` that will use
     determine whether the button is added to the Video.js control bar.
     Default: `true`.
   * **`plugins.remotePlayback.preferNativeAirPlay`**: A `boolean` that will use native
     AirPlay APIs when AirPlay is available, instead of Remote Playback API.
     Default: `false`.
   * **`plugins.remotePlayback.addLabelToButton`**: A `boolean` that indicates whether to
     add a text label next to the button icon.
     Default: `true`.
   * **`plugins.remotePlayback.label`**: A `string` of the label text to use. For default
     Remote Playback implementation, it is "Cast". If AirPlay is detected, it is
     "AirPlay". If you customize this label, it will use the same label for any instance.
     So, if you want different behavior based on presence of AirPlay or not, you will need
     to handle that logic.

## How do I contribute?

We genuinely appreciate external contributions. See [our extensive
documentation][contributing] on how to contribute.

## License

This software is released under the MIT license. See [the license file](LICENSE) for
more details.

[contributing]: https://github.com/silvermine/silvermine-info#contributing
[remoteplaybackapi]: https://developer.mozilla.org/en-US/docs/Web/API/Remote_Playback_API
[videojs-plugin-setup]: https://legacy.videojs.org/guides/plugins/#setting-up-a-plugin
[webkit]: https://webkit.org
[videojs]: https://videojs.org
