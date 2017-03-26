/* jshint strict:global */
/* globals $, Image, window, console */

"use strict";
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
    /* Der URL wird der GET Parameter rnd mit der aktuellen Stunde angefügt, damit das Bild 
     * mindestens 1x pro Stunde neu geladen wird, auch wenn es im Cache ist */
    var d = new Date();
    url = url + ((url.indexOf("?") === -1) ? "?" : "&") + "rnd=" + d.getUTCymdh();
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
    container: null,
    minTime: 0,
    maxTime: 384,
    lastRun: { arpege: null, gfs: null, arpegeWetter3: null },        // Wird in index.html gesetzt.    
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

        /* DIe Zeit berichtigen, da arpege immer später dran ist. Daher können wir zwar schon
         * Daten des GFS 6h Laufes, aber noch keine von Arpege haben. */
        var arpegeDelay = (this.lastRun.gfs.getTime() - this.lastRun.arpege.getTime()) / 3600000;

        return function (time) {
            var runHour = 0;
            var modelParam = model;
            var regionParam = region;

            if (model === "arpege") {
                runHour = Weathermap.lastRun.arpege.getUTCHours();
                time += arpegeDelay;
            }
            else { runHour = Weathermap.lastRun.gfs.getUTCHours(); }

            /* Die 6 h und 18 h Läufe werden bei ARPEGE nur bis 72 h bzw. 60h gerechnet. Daher nehmen wir
             * die Läufe von 0 h bzw. 12 h */
            if (model === "arpege" && ((runHour === 6 && time > 72) || (runHour === 18 && time > 60))) {
                if (time + 6 <= 102) {
                    runHour = (runHour - 6) % 24;
                    time += 6;

                }
                else {
                    regionParam = "euratl";
                    modelParam = "gfs";
                    runHour = Weathermap.lastRun.gfs.getUTCHours();
                    time -= arpegeDelay;
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
        /* DIe Zeit berichtigen, da arpege immer später dran ist. Daher können wir zwar schon
         * Daten des GFS 6h Laufes, aber noch keine von Arpege haben. */
        var arpegeDelay = (this.lastRun.gfs.getTime() - this.lastRun.arpege.getTime()) / 3600000;

        return function (time) {
            var regionParam = region;
            var runHour = 0;


            if (region.substring(0, 5) === "ARPOP") {
                runHour = Weathermap.lastRun.arpege.getUTCHours();
                time += arpegeDelay;
            }
            else { runHour = Weathermap.lastRun.gfs.getUTCHours(); }

            /* Die 6 h und 18 h Läufe werden bei ARPEGE nur bis 72 h bzw. 60h gerechnet. Daher nehmen wir
             * die Läufe von 0 h bzw. 12 h */
            if (region.substring(0, 5) === "ARPOP" && ((runHour === 6 && time > 72) || (runHour === 18 && time > 60))) {
                if (time + 6 <= 102) {
                    runHour = (runHour - 6) % 24;
                    time += 6;
                }
                else {
                    regionParam = "GFSOP" + regionParam.substring(5);
                    runHour = Weathermap.lastRun.gfs.getUTCHours();
                    time -= arpegeDelay;
                }
            }

            var timeParam = time;
            var runParam = runHour < 10 ? "0" + runHour : runHour;
            return "http://www.wetterzentrale.de/maps/" + regionParam + runParam + "_" + timeParam + "_" + type + ".png";
        };
    },
    getW3UrlGenerator: function (type, model) {
        if (model === undefined || model === "GFS") { model = ""; }
        else { model = "_" + model; }

        /* Konnte der Arpegelauf nicht von wetter3 gelesen werden, dann nehmen wir den vom User
         * gew#hlten Wert. */
        if (!this.lastRun.arpegeWetter3) {
            this.lastRun.arpegeWetter3 = this.lastRun.arpege;
        }

        /* DIe Zeit berichtigen, da arpege immer später dran ist. Daher können wir zwar schon
         * Daten des GFS 6h Laufes, aber noch keine von Arpege haben. */
        var arpegeDelay = (this.lastRun.gfs.getTime() - this.lastRun.arpegeWetter3.getTime()) / 3600000;

        return function (time) {
            var runHour = 0;
            if (model === "_ARPEGE") {
                runHour = Weathermap.lastRun.arpegeWetter3.getUTCHours();
                time += arpegeDelay;
            }
            else { runHour = Weathermap.lastRun.gfs.getUTCHours(); }

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
                    runHour = Weathermap.lastRun.gfs.getUTCHours();
                    time -= arpegeDelay;
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
        var runParam = run.getUTCHours() < 10 ? "0" + run.getUTCHours() : run.getUTCHours();
        /* Da die WRF 4km Modelle 2x am Tag mit 7 Stunden verzögerung zur Verfügung stehen, 
         * muss eine Korrektur zu den anderen Modellen (4x am Tag mit 6 h Verzögerung)
         * eingefügt werden.  */
        var wrfDelay = (Weathermap.lastRun.gfs.getTime() - run.getTime()) / 3600000;

        return function (time) {
            time += wrfDelay;
            var timeParam = "";
            var modelParam = model;
            // Der 12h Lauf des 4km WRF Modelles geht nur bis 54h. Danach nehmen wir das 12km Modell.
            if (model == "WRF4km" && run.getUTCHours() == 12 && time > 54) {
                modelParam = "WRF";
            }
            /* Die 1h Karten gibt es nur für 1h Niederschlag, Bewölkung und 2m Temperatur */
            if (type === "RR1h_eu" || type === "clouds_comp2b" || type === "T2m_eu2") {
                /* Die Basis für den Zeitoffset ist 2h nach dem GFS Initiallauf. */
                time -= 2;
                timeParam = time < 10 ? "0" + time : time;
                return "http://www.modellzentrale.de/" + modelParam + "/" + runParam + "Z/eu_dt/" + type + "_" + timeParam + "h.png";
            }
            else {
                timeParam = time < 10 ? "0" + time : time;
                return "http://www.modellzentrale.de/" + modelParam + "/" + runParam + "Z/" + timeParam + "h/" + type + ".png";
            }
        };
    },

    getMeteocielUrlCenerator: function (model, type, map) {
        if (model === undefined) { model = "gfs"; }
        if (type === undefined) { type = "0"; }
        if (map === undefined) { map = "gfseu"; }

        var run = Date.fromRunParam(6, 8);
        var wrfDelay = (Weathermap.lastRun.gfs.getTime() - run.getTime()) / 3600000;
        var runParam = run.getUTCymdh();
        return function (time) {
            var stepParam = "";
            /* Die 3h Zwischenkarten haben ein Prefix, da sie nicht gespeichert werden. */
            if ((time + 3) % 6 === 0) {
                stepParam = "-3h";
            }
            /* GFS berücksichtigt keinen Timestamp für den Lauf, es wird der Letzte geliefert. */
            if (model === "gfs") {
                /* http://modeles.meteociel.fr/modeles/gfs/run/gfseu-0-6.png */
                return "http://modeles.meteociel.fr/modeles/gfs/run/" + map + "-" + type + "-" + time + stepParam + ".png";
            }
            if (model === "gens") {        // Diagramme (GfsEnsemble)
                if (map === "gfseu") {
                    return "http://modeles7.meteociel.fr/modeles/gens/graphe_ens" + type + ".php?ext=1&lat=48&lon=16.5";
                }
                else {
                    return "http://modeles7.meteociel.fr/modeles/gens/graphe_ens" + type + ".php?" + map + "&ext=1&lat=48&lon=16.5";
                }
            }
            if (model.substring(0, 3) === "wrf") {
                time += wrfDelay;

                /* http://modeles.meteociel.fr/modeles/wrfnmm/runs/2017030400/nmmde-1-44-0.png */
                return "http://modeles.meteociel.fr/modeles/" + model + "/runs/" + runParam + "/" + map + "-" + type + "-" + time + "-0.png";
            }
            return "";
        };
    },

    getMeteogiornaleUrlGenerator: function (model, type, region) {
        if (model === undefined) { model = "gfs"; }
        if (type === undefined) { type = "z500"; }
        if (region === undefined) { region = "centroeuropa"; }
        return function (time) {
            return "http://maps.meteogiornale.it/"+model+"/" + region + "/" + type + "_" + time + ".png";
        };
    },

    createPanels: function (panelsToLoad) {
        var p = null, panelDiv = null, i = 0;
        var self = this;
        panelsToLoad.forEach(function (panel) {
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
            self.container.find("#panels").append(panelDiv);
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

Weathermap.initUi = function (container) {
    this.container = $("#" + container);
    this.container.show();
    $("#timeSlider").on("change", function (event, ui) {
        Weathermap.time = $("#timeSlider").val();
    });
    Weathermap.createPanels([
        /* wxcharts MSLP */
        [
            { start: 0, step: 3, stop: 240, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("mslp") },
            { start: 252, step: 12, stop: 384, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("mslp") },

            { start: 0, step: 6, stop: 240, layer: 1, urlGenerator: Weathermap.getWxcUrlGenerator("meanslp_anom") },
            { start: 252, step: 12, stop: 384, layer: 1, urlGenerator: Weathermap.getWxcUrlGenerator("meanslp_anom") },
            // Hohe Warte Surroundings
            { start: Weathermap.maxTime, layer: 2, urlGenerator: function () { return "http://old.wetterzentrale.de/pics/11035.gif"; } }
        ],
        /* wxcharts 500 hpa geopot height (europa von wxcharts und wetterzentrale, wxcharts polaransicht) */
        [
            { start: 0, step: 3, stop: 240, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("gh500") },
            { start: 252, step: 12, stop: 384, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("gh500") },

            { start: 0, step: 3, stop: 240, layer: 1, urlGenerator: Weathermap.getMeteogiornaleUrlGenerator("gfs", "z500", "centroeuropa") },
            { start: 252, step: 12, stop: 384, layer: 1, urlGenerator: Weathermap.getMeteogiornaleUrlGenerator("gfs", "z500", "centroeuropa") },
            /*
            { start: 3, step: 3, stop: 240, layer: 1, urlGenerator: Weathermap.getWzUrlGenerator(1, "GFSOPME") },
            { start: 252, step: 12, stop: 384, layer: 1, urlGenerator: Weathermap.getWzUrlGenerator(1, "GFSOPME") },
            */
            { start: 0, step: 3, stop: 240, layer: 2, urlGenerator: Weathermap.getMeteogiornaleUrlGenerator("gfs", "z500", "euroatlantico") },
            { start: 252, step: 12, stop: 384, layer: 2, urlGenerator: Weathermap.getMeteogiornaleUrlGenerator("gfs", "z500", "euroatlantico") },

            { start: 0, step: 24, stop: 240, layer: 3, urlGenerator: Weathermap.getMeteogiornaleUrlGenerator("ecmwf", "z500", "euroatlantico") },            
            /*
            { start: 0, step: 6, stop: 240, layer: 4, urlGenerator: Weathermap.getWxcUrlGenerator("gph500_anom") },
            { start: 252, step: 12, stop: 384, layer: 4, urlGenerator: Weathermap.getWxcUrlGenerator("gph500_anom") },
            */
            /*
            { start: 3, step: 3, stop: 240, layer: 3, urlGenerator: Weathermap.getWzUrlGenerator(1, "GFSOPEU") },
            { start: 252, step: 12, stop: 384, layer: 3, urlGenerator: Weathermap.getWzUrlGenerator(1, "GFSOPEU") },
            */

            { start: 0, step: 3, stop: 240, layer: 4, urlGenerator: Weathermap.getWxcUrlGenerator("gh500", "polar") },
            { start: 252, step: 12, stop: 384, layer: 4, urlGenerator: Weathermap.getWxcUrlGenerator("gh500", "polar") }
        ],
        /* wxcharts 850 hpa temp, 850 hpa temp anomaly */
        [
            { start: 0, step: 3, stop: 240, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("850temp") },
            { start: 252, step: 12, stop: 384, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("850temp") },

            { start: 3, step: 3, stop: 240, layer: 1, urlGenerator: Weathermap.getWzUrlGenerator(2, "GFSOPME") },
            { start: 252, step: 12, stop: 384, layer: 1, urlGenerator: Weathermap.getWzUrlGenerator(2, "GFSOPME") },

            /* ECMWF T850 */
            { start: 0, step: 24, stop: 240, layer: 2, urlGenerator: Weathermap.getMeteogiornaleUrlGenerator("ecmwf", "t850", "centroeuropa") },

            // WXC 850hpa Anomalie
            { start: 0, step: 6, stop: 240, layer: 3, urlGenerator: Weathermap.getMeteogiornaleUrlGenerator("gfs", "t850anom", "centroeuropa") },
            { start: 252, step: 12, stop: 384, layer: 3, urlGenerator: Weathermap.getMeteogiornaleUrlGenerator("gfs", "t850anom", "centroeuropa") },

            { start: 0, step: 24, stop: 240, layer: 4, urlGenerator: Weathermap.getMeteogiornaleUrlGenerator("ecmwf", "t850anom", "centroeuropa") }

        ],
        /* wxcharts overview, niederschlag und Gesamtbewölkung*/
        [
            { start: 1, step: 1, stop: 102, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "europe", "arpege") },
            { start: 103, step: 1, stop: 120, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "europe") },
            { start: 123, step: 3, stop: 240, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "europe") },
            { start: 252, step: 12, stop: 384, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "europe") },

            { start: 1, step: 1, stop: 102, layer: 1, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "germany", "arpege") },
            { start: 103, step: 1, stop: 120, layer: 1, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "germany") },
            { start: 123, step: 3, stop: 240, layer: 1, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "germany") },
            { start: 252, step: 12, stop: 384, layer: 1, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "germany") },
            // W3 6h Max/Min 2m Temperatur
            { start: 6, step: 6, stop: 102, layer: 2, urlGenerator: Weathermap.getW3UrlGenerator(9, "ARPEGE") },
            { start: 108, step: 6, stop: 240, layer: 2, urlGenerator: Weathermap.getW3UrlGenerator(9, "GFS") },
             // w3 6h niederschlag
            { start: 6, step: 6, stop: 102, layer: 3, urlGenerator: Weathermap.getW3UrlGenerator(4, "ARPEGE") },
            { start: 105, step: 3, stop: 240, layer: 3, urlGenerator: Weathermap.getW3UrlGenerator(28, "GFS") },
            // Gesamtbewölkung
            { start: 3, step: 3, stop: 72, layer: 4, urlGenerator: Weathermap.getW3UrlGenerator(13, "ARPEGE") },
            { start: 78, step: 6, stop: 102, layer: 4, urlGenerator: Weathermap.getW3UrlGenerator(13, "ARPEGE") },
            { start: 105, step: 3, stop: 240, layer: 4, urlGenerator: Weathermap.getW3UrlGenerator(18, "GFS") },
            // W3 700 hpa Feuchtigkeit
            { start: 3, step: 3, stop: 240, layer: 5, urlGenerator: Weathermap.getW3UrlGenerator(2, "GFS") },
            // Akkumulierter Niederschlag
            { start: 6, step: 6, stop: 102, layer: 6, urlGenerator: Weathermap.getW3UrlGenerator(26, "ARPEGE") },
            { start: 108, step: 6, stop: 240, layer: 6, urlGenerator: Weathermap.getW3UrlGenerator(26, "GFS") },
            { start: 252, step: 12, stop: 384, layer: 6, urlGenerator: Weathermap.getWzUrlGenerator(49, "GFSOPME") }
        ],
        /* wrf 4km karten, akkumulierter niederschlag */
        [
            // significant weather
            { start: 0, step: 3, stop: 72, layer: 0, preload: true, urlGenerator: Weathermap.getMzUrlGenerator("wx_eu") },
            // WRF 4km Modellzentrale Niederschlag bis 72h 
            { start: 3, step: 1, stop: 72, layer: 1, urlGenerator: Weathermap.getMzUrlGenerator("RR1h_eu") },
            // Meteociel WRF 0.05° Resume DE
            { start: 1, step: 1, stop: 72, layer: 2, urlGenerator: Weathermap.getMeteocielUrlCenerator("wrfnmm", 24, "nmmde") },
            // WRF 4km Temperatur und Wind
            { start: 3, step: 1, stop: 72, layer: 3, urlGenerator: Weathermap.getMzUrlGenerator("T2m_eu2") },
            // WRF 4km Modellzentrale Clouds
            { start: 3, step: 1, stop: 72, layer: 4, urlGenerator: Weathermap.getMzUrlGenerator("clouds_comp2b") },
            // Meteociel WRF 0.05° Rafales 1h
            { start: 1, step: 1, stop: 72, layer: 5, urlGenerator: Weathermap.getMeteocielUrlCenerator("wrfnmm", 11, "nmmde") },
            // Meteociel WRF 0.05° Accu Precip
            { start: 1, step: 1, stop: 72, layer: 6, urlGenerator: Weathermap.getMeteocielUrlCenerator("wrfnmm", 25, "nmmde") }
            /*

            // WRF 4km Modellzentrale Low Clouds
            { start: 0, step: 3, stop: 72, layer: 1, urlGenerator: Weathermap.getMzUrlGenerator("cloudslow_eu") },
            // WRF Wind
            { start: 0, step: 3, stop: 72, layer: 3, urlGenerator: Weathermap.getMzUrlGenerator("vectors10m_eu2") },


            // Meteociel WRF 0.05° 2m Temp
            { start: 1, step: 1, stop: 72, layer: 2, urlGenerator: Weathermap.getMeteocielUrlCenerator("wrfnmm", 0, "nmmde") },
            // Meteociel WRF 0.05° Niederschlag DE
            { start: 1, step: 1, stop: 72, layer: 5, urlGenerator: Weathermap.getMeteocielUrlCenerator("wrfnmm", 1, "nmmde") },
            // Meteociel WRF 0.05° Niederschlag Alpen
            { start: 1, step: 1, stop: 72, layer: 6, urlGenerator: Weathermap.getMeteocielUrlCenerator("wrfnmm", 1, "nmmsw") }
           */

        ],
        /* wz 850hpa wind (mitteleuropa und europa) und theta e */
        [
            // wz theta 3
            { start: 0, step: 3, stop: 240, layer: 0, preload: true, urlGenerator: Weathermap.getWzUrlGenerator(7) },
            { start: 252, step: 12, stop: 384, layer: 0, preload: true, urlGenerator: Weathermap.getWzUrlGenerator(7) },
            // 500 hpa Temp
            { start: 0, step: 3, stop: 240, layer: 1, urlGenerator: Weathermap.getMeteogiornaleUrlGenerator("gfs", "t500", "centroeuropa") },
            { start: 252, step: 12, stop: 384, layer: 1, urlGenerator: Weathermap.getMeteogiornaleUrlGenerator("gfs", "t500", "centroeuropa") },      

            { start: 0, step: 3, stop: 240, layer: 2, urlGenerator: Weathermap.getMeteogiornaleUrlGenerator("gfs", "t500", "euroatlantico") },
            { start: 252, step: 12, stop: 384, layer: 2, urlGenerator: Weathermap.getMeteogiornaleUrlGenerator("gfs", "t500", "euroatlantico") }, 

            // wz 850 hpa gfs stromlinien (mitteleuropa)
            { start: 3, step: 3, stop: 240, layer: 3, urlGenerator: Weathermap.getWzUrlGenerator(3, "GFSOPME") },
            { start: 252, step: 12, stop: 384, layer: 3, urlGenerator: Weathermap.getWzUrlGenerator(3, "GFSOPME") },

            // Wind Gust
            { start: 3, step: 3, stop: 72, layer: 4, urlGenerator: Weathermap.getW3UrlGenerator(31, "ARPEGE") },
            { start: 78, step: 6, stop: 102, layer: 4, urlGenerator: Weathermap.getW3UrlGenerator(31, "ARPEGE") },
            { start: 105, step: 3, stop: 240, layer: 4, urlGenerator: Weathermap.getWzUrlGenerator(19) },
            { start: 252, step: 12, stop: 384, layer: 4, urlGenerator: Weathermap.getWzUrlGenerator(19) }
        ]
    ]);
    Weathermap.time = 0;  // Panels zum Zeitpunkt t=0 anzeigen.
};

Weathermap.destroyUi = function () {
    this.container.hide();
};

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

