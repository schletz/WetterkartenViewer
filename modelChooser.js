/* jshint strict:global */
/* globals $, console, Weathermap, init1 */

"use strict";
var ModelChooserViewModel = {
    lastRun: {},
    _previewImages: [],
    container: null,

    get logContainer() { return $(this.container).parent().find("#log"); },
    get previewImages() { return this._previewImages; },
    set previewImages(value) {
        var self = this;
        var rand = (new Date()).getUTCymdh();
        var model = value.model;
        var modelContainer = $('[data-model="' + model + '"]');
        value.images.forEach(function (item) {
            var imgContainer = $("<div>").addClass("wxImage");
            imgContainer.append($("<img>").attr("src", item.url + "?rnd=" + rand));
            imgContainer.data("runHour", item.runHour);
            imgContainer.data("model", model);
            imgContainer.on("click", function () {
                self.onModelPreviewClick(this);
            });
            $(modelContainer).append(imgContainer);
        });
        this.container.append(modelContainer);
    },

    onModelPreviewClick: function (source) {
        $(source).parent().find(".wxImage").css("border", "0px");
        $(source).css("border", "3px solid blue");

        var runHour = 1 * $(source).data("runHour");
        var model = $(source).data("model");
        this.lastRun[model] = Date.fromUTCHours(runHour);
        if (this.lastRun.arpege && this.lastRun.gfs) {
            Weathermap.lastRun = this.lastRun;
            this.destroyUi();
            Weathermap.initUi("panelsPage");
        }
    },

    loadWetter3ArpegeRun: function (initString) {
        /* Wenn die Variable init1 geladen wurde, setzen wir diese. Wenn nicht (bei
         * Android kann es wegen dem Content Type text für ein JS zu Problemen kommen),
         * laden wir sie über einen AJAX Request. */
        if (typeof initString !== "undefined" && (this.lastRun.arpegeWetter3 = Date.fromW3InitString(initString))) {
            this.logContainer.append('<p>Gelesener Arpege Lauf von Wetter3 über JS:' + this.lastRun.arpegeWetter3.toISOString() + "<p>");
            return;
        }
        var rand = Math.floor(Math.random() * 4294967296);
        /* Die Variable init1 von http://www1.wetter3.de/initarpege laden, damit wir
         * den Modelllauf von Arpege auf wetter3.de lesen können. Dazu ist ein CORS
         * Proxy nötig, da der Server keine Cross Origin Requests erlaubt. */
        var url = "https://crossorigin.me/http://www1.wetter3.de/initarpege?rnd=" + rand;
        this.logContainer.append('<p>Lade Wetter3 ARPEGE Daten...</p>');
        var self = this;
        $.ajax({
            url: url,
            dataType: "text",
            method: "get"
        }).done(function (res) {
            /* Match für var init1 = 'Fr, 03-03-2017 18 UTC' */
            var matches = res.match(/var\s+init1\s*=\s*'([^']+)'/i);
            if (matches !== null &&
                (self.lastRun.arpegeWetter3 = Date.fromW3InitString(matches[1]))) {
                self.logContainer.append('<p>Gelesener Arpege Lauf von Wetter3 über Ajax:' + self.lastRun.arpegeWetter3.toISOString() + "<p>");
            }
            else {
                self.logContainer.append('<p class="error">String von <a href="http://www1.wetter3.de/initarpege">http://www1.wetter3.de/initarpege</a> nicht lesbar.</p>');
            }
        }).fail(function (xhr, textStatus, errorThrown) {
            self.logContainer.append('<p class="error">Request von <a href="' + url + '">' + url + '</a>" nicht möglich.</p>');
        });
    }

};

ModelChooserViewModel.initUi = function (container) {
    this.container = $("#" + container);
    this.container.show();
    $("#diagramPage").show();
    this.previewImages = {
        model: "gfs", images: [
            { runHour: 0, url: "http://wxcharts.eu/charts/gfs/germany/00/overview_384.jpg" },
            { runHour: 6, url: "http://wxcharts.eu/charts/gfs/germany/06/overview_384.jpg" },
            { runHour: 12, url: "http://wxcharts.eu/charts/gfs/germany/12/overview_384.jpg" },
            { runHour: 18, url: "http://wxcharts.eu/charts/gfs/germany/18/overview_384.jpg" },
        ]
    };
    this.previewImages = {
        model: "arpege", images: [
            { runHour: 0, url: "http://wxcharts.eu/charts/arpege/germany/00/overview_102.jpg" },
            { runHour: 6, url: "http://wxcharts.eu/charts/arpege/germany/06/overview_072.jpg" },
            { runHour: 12, url: "http://wxcharts.eu/charts/arpege/germany/12/overview_102.jpg" },
            { runHour: 18, url: "http://wxcharts.eu/charts/arpege/germany/18/overview_060.jpg" },
        ]
    };
    this.loadWetter3ArpegeRun(init1);
};

ModelChooserViewModel.destroyUi = function () {
    $("#diagramPage").hide();
    this.container.hide();
};