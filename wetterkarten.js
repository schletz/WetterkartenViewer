/* jshint strict:global */
/* globals $, Image, window, console  */

"use strict";
/**
 * Erzeugt ein Datumsobjekt, welches auf den aktuellen Lauf verweist. Dabei wird das Intervall der
 * Läufe und die Verzögerung der Datenaufbereitung berücksichtigt. 
 * @example Date.fromRunParam(6,5) // Liefert am 12.2.2017 um 15:00 UTC den Wert 12.2.2017 6:00 UTC
 * 
 * @param {number} runsInterval Der Abstand zwischen den Läufen (z. B: 6 für 4x täglich)
 * @param {number} delay Die Verzögerung, bis die Daten zur Verfügungs stehen.
 * @returns Das Datumsobjekt, wann der aktuelle Lauf gestartet wurde.
 */
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

/**
 * Formatiert das Datum in der Form YYYYMMDD. Dies wird bei manchen URLs als Parameter verwendet.
 * 
 * @returns Ein String der Form YYYYMMDD
 */
Date.prototype.getUTCymd = function () {
    var year = this.getUTCFullYear();
    var month = this.getUTCMonth() + 1;
    var day = this.getUTCDate();

    if (month < 10) { month = "0" + month; }
    if (day < 10) { day = "0" + day; }

    return "" + year + month + day;
};

/**
 * Formatiert das Datum in der Form YYYYMMDDHH. Dies wird bei manchen URLs als Parameter verwendet.
 * 
 * @returns Ein String der Form YYYYMMDDHH
 */
Date.prototype.getUTCymdh = function () {
    var hour = this.getUTCHours();
    hour = hour < 10 ? "0" + hour : "" + hour;

    return this.getUTCymd() + hour;
};


/**
 * Repräsentiert das einzelne Panel. Ein Pabel beinhaltet mehrere Zeitschritte, ein Zeitschritte
 * beinhaltet mehrere Layer.
 */
function Panel() {
    this.images = [];
    this.imageDictionary = {};        // Damit nur 1 Bild pro URL erzeugt wird.
    this.defaultImage = new Image();
    this.currentImage = null;         // Wird von getImage gesetzt.
    this.currentLayer = 0;            // Wird von getImage gesetzt.
    this.maxLayer = 0;                // Wird von createImages gesetzt.

    this.defaultImage.src = "notAvailable.jpg";
}

/**
 * Erzeugt ein Imageobjekt und setzt die Quelle auf die übergebene URL. Zusätzlich wird die URL
 * als Key für das Imagedirectory verwendet. Wurde diese URL schon geladen, wird aus dem 
 * Directory das Imageobjekt zurückgegeben.
 * 
 * @param {string} url
 * @returns
 */
Panel.prototype.loadImage = function (url) {
    if (this.imageDictionary[url] !== undefined) {
        return this.imageDictionary[url];
    }

    var img = new Image();
    this.imageDictionary[url] = img;
    /* Der URL wird der GET Parameter rnd angefügt, damit das Bild immer neu geladen wird, auch Wenn
     * es im Cache ist */
    url = url + ((url.indexOf("?") === -1) ? "?" : "&") + "rnd=" + Date.now();
    img.src = url;
    return img;
};

/**
 * Legt die leere Arraystruktur des Panels an:
 * images
 *   |_ time
 *        |_ layer
 *             |_ {url, image}
 * 
 * @param {object} timestep Die Konfiguration des Panels in der Form 
 * {start: number, step: number, stop: number, layer:number, preload:boolean, urlGenerator:function}
 * start/stop gibt den untersten/pbersten Zeitwert in h (inklusive) an, step die Schrittweite in h.
 * layer gibt die Ebene an. Bei jedem Klick wird um 1 Ebene weitergeschalten.
 * Bei preload = true werden alle Bilder vorgeladen. Sonst wird als Imageobjekt null erzeugt und 
 * erst bei Bedarf erzeugt.
 * Die Funktion urlGenerator wird automatisch mit 1 Parameter (der Zeit in h) aufgerufen. Die 
 * zurückgegebene URL wird zum Laden des Bildes verwendet.
 */
Panel.prototype.createImages = function (timestep) {
    var time = 0;
    if (timestep === undefined) { timestep = {}; }
    if (isNaN(timestep.start)) { timestep.start = 0; }
    if (isNaN(timestep.step)) { timestep.step = 1; }
    if (isNaN(timestep.stop)) { timestep.stop = timestep.start; }
    if (isNaN(timestep.layer)) { timestep.layer = 0; }

    if (timestep.layer > this.maxLayer) {
        this.maxLayer = timestep.layer;
    }
    for (time = timestep.start; time <= timestep.stop; time += timestep.step) {
        if (this.images[time] === undefined) {
            this.images[time] = [];
        }
        this.images[time][timestep.layer] = {
            url: timestep.urlGenerator(time),
            image: null
        };
    }
    if (timestep.preload) {
        this.preloadImages(timestep.layer);
    }
};

/**
 * Lädt alle Bilder der entsprechenden Ebene des Panels vor. Dies kann am Anfang durch die Option
 * preload:true erfolgen. Wird ein Panel vergrößert, dann werden alle Bilder vorgeladen.
 * 
 * @param {number} layer
 */
Panel.prototype.preloadImages = function (layer) {
    if (isNaN(layer)) { layer = this.currentLayer; }

    var self = this, time = 0, imgElem = null;
    for (time in this.images) {
        time *= 1;                                             // for...in liefert einen string key!
        imgElem = this.images[time][layer];
        // Nicht alle Ebenen haben bei jedem Zeitschritt einen Eintrag (6h Bilder vs 3h Bilder).
        if (imgElem !== undefined && imgElem.image === null) {
            imgElem.image = this.loadImage(imgElem.url);
        }
    }
};

/**
 * Liefert ein Imageobjekt aus dem Panel zurück.
 * 
 * @param {number} time Der Zeitpunkt, welches Bild gewählt werden soll.
 * @param {object} options Besteht aus {seek:number, layer:number}. Seek gibt an, wie viel Stunden
 * in der Zukunft nach einem Bild gesucht werden soll (bei 12h Intervallen gibt es keine Bilder für
 * 3h, 6h und 9h. Daher ist das notwendig). Der Defaultwert ist unendlich.
 * Layer gibt die Ebene an. Der Defaultwert ist die aktuell angezeigte Ebene.
 * @returns Das gefundene und geladene Imageobjekt.
 */
Panel.prototype.getImage = function (time, options) {
    try {
        var imgElem = null, t = 0;
        if (isNaN(time)) { time = 0; }
        if (options === undefined) { options = {}; }
        if (isNaN(options.seek)) { options.seek = this.images.length; }
        if (isNaN(options.layer)) { options.layer = this.currentLayer; }

        this.currentLayer = options.layer > this.maxLayer ? 0 : options.layer;
        // Vom aktuellen Zeitpunkt an in der Zukunft nach dem ersten Bild suchen.
        for (t = time; t <= time + options.seek; t++) {
            if (this.images[t] !== undefined && this.images[t][this.currentLayer] !== undefined) {
                imgElem = this.images[t][this.currentLayer];
                if (imgElem.image === null) {
                    // Wenn das Bild nicht vorgeladen wurde, laden wir es jetzt.
                    imgElem.image = this.loadImage(imgElem.url);
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
 * View Model Weathermap
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
        // Wenn ein Panel maximiert wird, werden alle Bilder dieses Layers vorgeladen.
        this.fullsizePanel.preloadImages();
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
        { start: Weathermap.maxTime, layer: 2, urlGenerator: function () { return "http://old.wetterzentrale.de/pics/MT8_Wien_ens.png"; } },
        { start: Weathermap.maxTime, layer: 3, urlGenerator: function () { return "http://www.wetterzentrale.de/maps/GFSENS00_48_16_206.png"; } }
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
    /* wxcharts overview, niederschlag und Gesamtbewölkung*/
    [
        { start: 3, step: 3, stop: 102, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "europe", "arpege") },
        { start: 105, step: 3, stop: 240, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("overview") },
        { start: 252, step: 12, stop: 384, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("overview") },

        { start: 3, step: 3, stop: 102, layer: 1, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "germany", "arpege") },
        { start: 105, step: 3, stop: 240, layer: 1, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "germany") },
        { start: 252, step: 12, stop: 384, layer: 1, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "germany") },
        // w3 6h niederschlag
        { start: 6, step: 6, stop: 102, layer: 2, urlGenerator: Weathermap.getW3UrlGenerator(4, "ARPEGE") },
        { start: 105, step: 3, stop: 240, layer: 2, urlGenerator: Weathermap.getW3UrlGenerator(28, "GFS") },
        // Gesamtbewölkung
        { start: 3, step: 3, stop: 72, layer: 3, urlGenerator: Weathermap.getW3UrlGenerator(13, "ARPEGE") },
        { start: 78, step: 6, stop: 102, layer: 3, urlGenerator: Weathermap.getW3UrlGenerator(13, "ARPEGE") },
        { start: 105, step: 3, stop: 240, layer: 3, urlGenerator: Weathermap.getW3UrlGenerator(18, "GFS") }
    ],
    /* wrf 4km karten, akkumulierter niederschlag */
    [
        // WRF 4km Modellzentrale Niederschlag bis 72h
        { start: 0, step: 3, stop: 72, layer: 0, preload: true, urlGenerator: Weathermap.getMzUrlGenerator("RR3h_eu") },
        // WRF 4km Modellzentrale Low Clouds
        { start: 0, step: 3, stop: 72, layer: 1, urlGenerator: Weathermap.getMzUrlGenerator("cloudslow_eu") },
        // significant weather
        { start: 0, step: 3, stop: 72, layer: 2, urlGenerator: Weathermap.getMzUrlGenerator("wx_eu") },
        // Akkumulierter Niederschlag
        { start: 6, step: 6, stop: 102, layer: 3, urlGenerator: Weathermap.getW3UrlGenerator(26, "ARPEGE") },
        { start: 108, step: 6, stop: 240, layer: 3, urlGenerator: Weathermap.getW3UrlGenerator(26, "GFS") },
        { start: 252, step: 12, stop: 384, layer: 3, urlGenerator: Weathermap.getWzUrlGenerator(49, "GFSOPME") }
    ],
    /* wz 850hpa wind (mitteleuropa und europa) und theta e */
    [
        // wz 850 hpa gfs stromlinien (mitteleuropa und europa)
        { start: 0, step: 3, stop: 93, layer: 0, preload: true, urlGenerator: Weathermap.getWzUrlGenerator(3, "ARPOPME") },
        { start: 96, step: 6, stop: 102, layer: 0, preload: true, urlGenerator: Weathermap.getWzUrlGenerator(3, "ARPOPME") },
        { start: 105, step: 3, stop: 240, layer: 0, preload: true, urlGenerator: Weathermap.getWzUrlGenerator(3) },
        { start: 252, step: 12, stop: 384, layer: 0, preload: true, urlGenerator: Weathermap.getWzUrlGenerator(3) },

        { start: 0, step: 3, stop: 93, layer: 1, urlGenerator: Weathermap.getWzUrlGenerator(3, "ARPOPEU") },
        { start: 93, step: 6, stop: 102, layer: 1, urlGenerator: Weathermap.getWzUrlGenerator(3, "ARPOPEU") },
        { start: 105, step: 3, stop: 240, layer: 1, urlGenerator: Weathermap.getWzUrlGenerator(3, "GFSOPEU") },
        { start: 252, step: 12, stop: 384, layer: 1, urlGenerator: Weathermap.getWzUrlGenerator(3, "GFSOPEU") },
        // w3 10m wind gust
        { start: 3, step: 3, stop: 72, layer: 2, urlGenerator: Weathermap.getW3UrlGenerator(31, "ARPEGE") },
        { start: 78, step: 6, stop: 102, layer: 2, urlGenerator: Weathermap.getW3UrlGenerator(31, "ARPEGE") },
        { start: 105, step: 3, stop: 240, layer: 2, urlGenerator: Weathermap.getWzUrlGenerator(19) },
        { start: 252, step: 12, stop: 384, layer: 2, urlGenerator: Weathermap.getWzUrlGenerator(19) },
        // wz theta 3
        { start: 0, step: 3, stop: 93, layer: 3, urlGenerator: Weathermap.getWzUrlGenerator(7, "ARPOPME") },
        { start: 96, step: 6, stop: 102, layer: 3, urlGenerator: Weathermap.getWzUrlGenerator(7, "ARPOPME") },
        { start: 105, step: 3, stop: 240, layer: 3, urlGenerator: Weathermap.getWzUrlGenerator(7) },
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

var DraggableWindow = function (container) {
    return {
        offsetX: 0,
        offsetY: 0,
        drag: function (ev) {
            this.offsetX = ev.pageX;
            this.offsetY = ev.pageY;
        },
        drop: function (ev) {
            this.offsetX = ev.pageX - this.offsetX;
            this.offsetY = ev.pageY - this.offsetY;
            var pos = $(container).position();
            $(container).css("left", pos.left + this.offsetX);
            $(container).css("top", pos.top + this.offsetY);
        }
    };
};

