/* jshint strict:global */
/* globals $, Image, window, console  */

"use strict";
Date.fromRunParam = function (runsInterval, delay) {
    if (isNaN(runsInterval)) { runsInterval = 6; }
    if (isNaN(delay)) { delay = 0; }

    runsInterval *= 3600000;
    var d = new Date();
    d.setUTCHours(d.getUTCHours() - delay);
    d.setUTCMinutes(0);
    d.setUTCSeconds(0);
    d.setUTCMilliseconds(0);
    d.setTime(Math.floor(d.getTime() / runsInterval) * runsInterval);
    return d;
};

Date.prototype.getUTCymd = function () {
    var year = this.getUTCFullYear();
    var month = this.getUTCMonth() + 1;
    var day = this.getUTCDate();

    if (month < 10) { month = "0" + month; }
    if (day < 10) { day = "0" + day; }

    return "" + year + month + day;
};

Date.prototype.getUTCymdh = function () {
    var hour = this.getUTCHours();
    hour = hour < 10 ? "0" + hour : "" + hour;

    return this.getUTCymd() + hour;
};


function Panel() {
    this.images = [];
    this.imageDictionary = {};
    this.defaultImage = new Image();
    this.currentImage = null;
    this.currentLayer = 0;
    this.maxLayer = 0;

    this.defaultImage.src = "notAvailable.jpg";
}

Panel.prototype.loadImage = function (url) {
    if (this.imageDictionary[url] !== undefined) {
        return this.imageDictionary[url];
    }

    var img = new Image();
    img.src = url;
    this.imageDictionary[url] = img;
    return img;
};

Panel.prototype.createImages = function (timestep) {
    var time = 0;
    if (timestep === undefined) { timestep = {}; }
    if (isNaN(timestep.start)) { timestep.start = 0; }
    if (isNaN(timestep.step)) { timestep.step = 1; }
    if (isNaN(timestep.stop)) { timestep.stop = timestep.start; }
    if (isNaN(timestep.offset)) { timestep.offset = 0; }
    if (isNaN(timestep.layer)) { timestep.layer = 0; }

    if (timestep.layer > this.maxLayer) {
        this.maxLayer = timestep.layer;
    }
    for (time = timestep.start; time <= timestep.stop; time += timestep.step) {
        if (this.images[time] === undefined) {
            this.images[time] = [];
        }
        if (timestep.preload) {
            this.images[time][timestep.layer] = {
                urlGenerator: timestep.urlGenerator,
                offset: timestep.offset,
                image: this.loadImage(timestep.urlGenerator(time + timestep.offset))
            };
        }
        else {
            this.images[time][timestep.layer] = {
                urlGenerator: timestep.urlGenerator,
                offset: timestep.offset,
                image: null
            };
        }
    }
};

Panel.prototype.getImage = function (time, options) {
    try {
        var imgElem = null, t = 0;
        if (isNaN(time)) { time = 0; }
        if (options === undefined) { options = {}; }
        if (isNaN(options.seek)) { options.seek = this.images.length; }
        if (isNaN(options.layer)) { options.layer = this.currentLayer; }

        this.currentLayer = options.layer > this.maxLayer ? 0 : options.layer;
        for (t = time; t <= time + options.seek; t++) {
            if (this.images[t] !== undefined && this.images[t][this.currentLayer] !== undefined) {
                imgElem = this.images[t][this.currentLayer];
                if (imgElem.image === null) {
                    imgElem.image = this.loadImage(imgElem.urlGenerator(t + imgElem.offset));
                }
                this.currentImage = imgElem.image;
                return this.currentImage;
            }
        }
        this.currentImage = this.defaultImage;
    }
    catch (err) {
        this.currentImage = this.defaultImage;
    }
    return this.currentImage;
};

/**
 * 
 */
var Weathermap = {
    _container: "",
    get container() {
        return this._container;
    },
    set container(newContainer) {
        $(this.container).empty();
        this._container = "#" + newContainer;
        this.createPanels();
    },
    minTime: 0,
    maxTime: 384,
    step: 3,
    _time: 0,
    get time() {
        return this._time;
    },
    set time(newTime) {
        this._time = Math.min(this.maxTime, Math.max(this.minTime, newTime));
        var self = this;

        if ($("#timeSlider").val() != this.time) {
            $("#timeSlider").val(this.time);
            $('#timeSlider').slider('refresh');
        }

        $(".weatherPanel").each(function () {
            var panelObj = $(this).data("panel");
            var image = panelObj.getImage(self.time);
            $(this).empty().append(image);
        });

        if (this.fullsizePanel !== null) {
            var fullsizeImage = this.fullsizePanel.currentImage;
            $("#imageDetails img").remove();
            $("#imageDetails").append($(fullsizeImage).clone());
        }
    },
    _fullsizePanel: null,
    get fullsizePanel() {
        return this._fullsizePanel;
    },
    set fullsizePanel(newPanel) {
        this._fullsizePanel = newPanel;
        if (newPanel !== null) {
            this.showFullsizePanel();
        }
        else {
            $("#imageDetails img").remove();
            $("#imageDetails").hide();
        }
    },


    getWxcUrlGenerator: function (type, region, model) {
        if (region === undefined) {
            region = "euratl";
        }
        if (model === undefined) {
            model = "gfs";
        }
        var run = Date.fromRunParam(6, 5);
        return function (time) {
            var runHour = run.getUTCHours();
            var modelParam = model;
            var regionParam = region;
            /* Die 6 h und 18 h Läufe werden bei Wxcharts nur bis 72 h gerechnet. Daher nehmen wir
             * die Läufe von 0 h bzw. 12 h */
            if (model === "arpege" && (runHour === 6 || runHour === 18) && time > 72) {
                if (time + 6 <= 102) {
                    runHour = (runHour - 6) % 24;
                    time += 6;

                }
                else {
                    regionParam = "euratl";
                    modelParam = "gfs";
                }
            }
            var timeParam = time < 10 ? "00" + time : (time < 100 ? "0" + time : time);
            var runParam = runHour < 10 ? "0" + runHour : runHour;
            return "http://wxcharts.eu/charts/" + modelParam + "/" + regionParam + "/" + runParam + "/" + type + "_" + timeParam + ".jpg";
        };
    },
    getWzUrlGenerator: function (type, region) {
        if (region === undefined) {
            region = "GFSOPME";
        }
        var run = Date.fromRunParam(6, 5);

        return function (time) {
            var regionParam = region;
            var runHour = run.getUTCHours();
            /* Der 6h Lauf von ARPEGE wird nur bis 72h gerechnet. Daher nehmen wir den 0h Lauf. */
            if (region.substring(0, 5) === "ARPOP" && runHour === 6 && time > 72) {
                if (time + 6 <= 102) {
                    runHour = (runHour - 6) % 24;
                    time += 6;
                }
                else {
                    regionParam = "GFSOP" + regionParam.substring(5);
                }
            }
            var timeParam = time;            
            var runParam = runHour < 10 ? "0" + runHour : runHour;
            return "http://www.wetterzentrale.de/maps/" + regionParam + runParam + "_" + timeParam + "_" + type + ".png";
        };
    },
    getW3UrlGenerator: function (type, model) {
        if (model === undefined) { model = "_ICON"; }
        else if (model === "GFS") { model = ""; }
        else { model = "_" + model; }

        var run = Date.fromRunParam(6, 5);


        return function (time) {
            var runHour = run.getUTCHours();
            var modelParam = model;
            /* Die 6 h und 18 h Läufe werden bei Wetter3 nur bis +72 h bzw. +60 h gerechnet. Daher nehmen
             * wir den Lauf von 0 h bzw. 12 h */
            if (model === "_ARPEGE" && ((runHour === 6 && time > 72) || (runHour === 18 && time > 60))) {
                if (time + 6 <= 102) {
                    runHour = (runHour - 6) % 24;
                    time += 6;
                }
                else {
                    modelParam = "";
                }
            }
            var runParam = runHour < 10 ? "0" + runHour : runHour;
            var timeParam = time < 10 ? "0" + time : time;
            return "http://www1.wetter3.de/Animation_" + runParam + "_UTC_025Grad" + modelParam + "/" + timeParam + "_" + type + ".gif";
        };
    },

    getMzUrlGenerator: function (type, model) {
        if (model === undefined) { model = "WRF4km"; }
        var run = Date.fromRunParam(12, 7);
        var wxChartsRun = Date.fromRunParam(6, 5);
        var runParam = run.getUTCHours() < 10 ? "0" + run.getUTCHours() : run.getUTCHours();

        return function (time) {
            /* Da die WRF 4km Modelle 2x am Tag mit 7 Stunden verzögerung zur Verfügung stehen, 
             * muss eine Korrektur zu den anderen Modellen (4x am Tag mit 6 h Verzögerung)
             * eingefügt werden.  */
            time += (wxChartsRun.getTime() - run.getTime()) / 3600000;
            var timeParam = time < 10 ? "0" + time : time;
            return "http://www.modellzentrale.de/" + model + "/" + runParam + "Z/" + timeParam + "h/" + type + ".png";
        };
    },


    createPanels: function () {
        var p = null, panelDiv = null, i = 0;
        var self = this;
        self.panelsToLoad.forEach(function (panel) {
            p = new Panel();
            panel.forEach(function (panelData) {
                p.createImages(panelData);
            });
            panelDiv = $("<div>").addClass("weatherPanel").attr("id", "panel" + i);
            if (i % 2 === 0) { panelDiv.addClass("col-2"); }
            if (i % 3 === 0) { panelDiv.addClass("col-3"); }
            if (i % 4 === 0) { panelDiv.addClass("col-4"); }
            if (i % 5 === 0) { panelDiv.addClass("col-5"); }

            panelDiv.data("panel", p);
            panelDiv.data("layer", 0);
            panelDiv.on("click", function () { self.onPanelClick(this); });
            panelDiv.on("contextmenu", function () { self.fullsizePanel = $(this).data("panel"); });
            $(self.container).append(panelDiv);
            i += 1;
        });
    },

    onPanelClick: function (panel) {
        var panelObj = $(panel).data("panel");
        var image = panelObj.getImage(this.time, { layer: panelObj.currentLayer + 1 });
        $(panel).empty().append(image);
    },

    showFullsizePanel: function () {
        var leftPos = 0, topPos = 0, width = 600, height = 400;
        var image = this.fullsizePanel.currentImage;

        if (image.naturalWidth && image.naturalHeight) {
            width = image.naturalWidth;
            height = image.naturalHeight;
            if ($(window).width() < width) {
                width = $(window).width();
                height = width * image.naturalHeight / image.naturalWidth;
            }
            if ($(window).height() < height) {
                height = $(window).height();
                width = height * image.naturalWidth / image.naturalHeight;
            }
        }
        leftPos = ($(window).width() - width) / 2;
        $("#imageDetails img").remove();
        $("#imageDetails").css("left", leftPos + "px");
        $("#imageDetails").css("width", width + "px");
        $("#imageDetails").css("height", height + "px");
        $("#imageDetails").append($(image).clone());
        $("#imageDetails").show();
    }
};

Weathermap.panelsToLoad = [
    /* wxcharts MSLP */
    [
        { start: 0, step: 3, stop: 240, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("mslp") },
        { start: 252, step: 12, stop: 384, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("mslp") },
        { start: Weathermap.maxTime, layer: 1, urlGenerator: function () { return "http://old.wetterzentrale.de/pics/11035.gif"; } },
        { start: Weathermap.maxTime, layer: 2, urlGenerator: function () { return "http://old.wetterzentrale.de/pics/11035s.gif"; } },
        { start: Weathermap.maxTime, layer: 3, urlGenerator: function () { return "http://old.wetterzentrale.de/pics/MT8_Wien_ens.png"; } },
        { start: Weathermap.maxTime, layer: 4, urlGenerator: function () { return "http://www.wetterzentrale.de/maps/GFSENS00_48_16_206.png"; } }
    ],
    /* wxcharts 500 hpa geopot height (europa von wxcharts und wetterzentrale, wxcharts polaransicht) */
    [
        { start: 0, step: 3, stop: 240, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("gh500") },
        { start: 252, step: 12, stop: 384, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("gh500") },

        { start: 3, step: 3, stop: 240, layer: 1, urlGenerator: Weathermap.getWzUrlGenerator(1, "GFSOPEU") },
        { start: 252, step: 12, stop: 384, layer: 1, urlGenerator: Weathermap.getWzUrlGenerator(1, "GFSOPEU") },

        { start: 0, step: 3, stop: 240, layer: 2, urlGenerator: Weathermap.getWxcUrlGenerator("gh500", "polar") },
        { start: 252, step: 12, stop: 384, layer: 2, urlGenerator: Weathermap.getWxcUrlGenerator("gh500", "polar") }
    ],
    /* wxcharts 850 hpa temp, 850 hpa temp anomaly und 6h w3 extremtemp */
    [
        { start: 0, step: 3, stop: 240, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("850temp") },
        { start: 252, step: 12, stop: 384, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("850temp") },
        // W3 6h Max/Min 2m Temperatur
        { start: 6, step: 6, stop: 102, layer: 1, urlGenerator: Weathermap.getW3UrlGenerator(9, "ARPEGE") },
        { start: 108, step: 6, stop: 240, layer: 1, urlGenerator: Weathermap.getW3UrlGenerator(9, "GFS") },
        // 850 hpa temp germany
        { start: 0, step: 3, stop: 72, layer: 2, urlGenerator: Weathermap.getWxcUrlGenerator("850temp", "germany", "arpege") },
        { start: 78, step: 6, stop: 102, layer: 2, urlGenerator: Weathermap.getWxcUrlGenerator("850temp", "germany", "arpege") },
        { start: 105, step: 3, stop: 240, layer: 2, urlGenerator: Weathermap.getWxcUrlGenerator("850temp", "germany") },
        { start: 252, step: 12, stop: 384, layer: 2, urlGenerator: Weathermap.getWxcUrlGenerator("850temp", "germany") },

        // WXC 850hpa Anomalie
        { start: 0, step: 6, stop: 240, layer: 3, urlGenerator: Weathermap.getWxcUrlGenerator("850temp_anom") },
        { start: 252, step: 12, stop: 384, layer: 3, urlGenerator: Weathermap.getWxcUrlGenerator("850temp_anom") }


    ],
    /* wxcharts overview */
    [
        { start: 3, step: 3, stop: 102, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "europe", "arpege") },
        { start: 105, step: 3, stop: 240, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("overview") },
        { start: 252, step: 12, stop: 384, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("overview") },

        { start: 3, step: 3, stop: 102, layer: 1, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "germany", "arpege") },
        { start: 105, step: 3, stop: 240, layer: 1, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "germany") },
        { start: 252, step: 12, stop: 384, layer: 1, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "germany") }
    ],
    /* w3 niederschlag und wolken   */
    [
        // w3 6h niederschlag
        { start: 6, step: 6, stop: 102, layer: 0, preload: true, urlGenerator: Weathermap.getW3UrlGenerator(4, "ARPEGE") },
        { start: 105, step: 3, stop: 240, layer: 0, preload: true, urlGenerator: Weathermap.getW3UrlGenerator(28, "GFS") },
        // Gesamtbewölkung
        { start: 3, step: 3, stop: 72, layer: 1, urlGenerator: Weathermap.getW3UrlGenerator(13, "ARPEGE") },
        { start: 78, step: 6, stop: 102, layer: 1, urlGenerator: Weathermap.getW3UrlGenerator(13, "ARPEGE") },
        { start: 105, step: 3, stop: 240, layer: 1, urlGenerator: Weathermap.getW3UrlGenerator(18, "GFS") },
        // WRF 4km Modellzentrale Niederschlag bis 72h
        { start: 0, step: 3, stop: 72, layer: 2, urlGenerator: Weathermap.getMzUrlGenerator("RR3h_eu") },
        // WRF 4km Modellzentrale Low Clouds
        { start: 0, step: 3, stop: 72, layer: 3, urlGenerator: Weathermap.getMzUrlGenerator("cloudslow_eu") },
        // Akkumulierter Niederschlag
        { start: 6, step: 6, stop: 102, layer: 4, urlGenerator: Weathermap.getW3UrlGenerator(26, "ARPEGE") }
    ],
    /* wz 850hpa wind (mitteleuropa und europa) und theta e */
    [
        // w3 10m wind gust
        { start: 3, step: 3, stop: 72, layer: 0, preload: true, urlGenerator: Weathermap.getW3UrlGenerator(31, "ARPEGE") },
        { start: 78, step: 6, stop: 102, layer: 0, preload: true, urlGenerator: Weathermap.getW3UrlGenerator(31, "ARPEGE") },
        { start: 105, step: 3, stop: 240, layer: 0, preload: true, urlGenerator: Weathermap.getWzUrlGenerator(19) },
        { start: 252, step: 12, stop: 384, layer: 0, preload: true, urlGenerator: Weathermap.getWzUrlGenerator(19) },
        // wz 850 hpa gfs stromlinien (mitteleuropa und europa)
        { start: 0, step: 3, stop: 102, layer: 1, urlGenerator: Weathermap.getWzUrlGenerator(3, "ARPOPME") },
        { start: 102, step: 3, stop: 240, layer: 1, urlGenerator: Weathermap.getWzUrlGenerator(3) },
        { start: 252, step: 12, stop: 384, layer: 1, urlGenerator: Weathermap.getWzUrlGenerator(3) },
        { start: 0, step: 3, stop: 240, layer: 2, urlGenerator: Weathermap.getWzUrlGenerator(3, "GFSOPEU") },
        { start: 252, step: 12, stop: 384, layer: 2, urlGenerator: Weathermap.getWzUrlGenerator(3, "GFSOPEU") },
        // wz theta 3
        { start: 0, step: 3, stop: 240, layer: 3, urlGenerator: Weathermap.getWzUrlGenerator(7) },
        { start: 252, step: 12, stop: 384, layer: 3, urlGenerator: Weathermap.getWzUrlGenerator(7) }

    ]
];

function initUi() {
    $("#timeSlider").on("change", function (event, ui) {
        Weathermap.time = $("#timeSlider").val();
    });
    Weathermap.container = "panels";
    Weathermap.time = 0;
}
