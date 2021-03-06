// The place to pollute global namespace.

'use strict';

window.loadScript = function (url)
{
    var script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', url);
    document.body.appendChild(script);
    document.body.removeChild(script);
};

// Globals for patches that use pixi
window.initDisplay = function (fig, width, height) {
    width = width || 200;
    height = height || 150;
    fig.innerHTML = '';
    var display = {};
    display.renderer = PIXI.autoDetectRenderer(width, height);
    display.stage = new PIXI.Stage(0xFFFFFF);
    fig.appendChild(display.renderer.view);
    var animate = function () {
        window.requestAnimFrame(animate);
        display.renderer.render(display.stage);
    };
    window.requestAnimFrame(animate);

    return display;
};

window.createSprite = function (display, imageUrl) {
    var texture = PIXI.Texture.fromImage(imageUrl);
    var sprite = new PIXI.Sprite(texture);
    display.stage.addChild(sprite);
    return sprite;
};

window.getYahooWeatherUrl = function(where) {
    return 'https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20weather.forecast%20where%20woeid%20in%20(select%20woeid%20from%20geo.places(1)%20where%20text%3D%22' + where + '%22)&format=json';
};
