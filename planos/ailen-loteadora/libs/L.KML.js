"use strict";

L.KML = L.FeatureGroup.extend({
    initialize: function (kml, options = {}) {
        L.FeatureGroup.prototype.initialize.call(this, []);
        this._parseKML(kml, options);
    },

    _parseKML: function (xml, options) {
        const empresasManager = options["empresasManager"];
        this._styles = this._extractStyles(xml);
        const layers = this._parseElements(xml, options);
        layers.forEach(layer => this.addLayer(layer));

        layers.forEach(layer => {
            // iterara las capas
            console.log(layer.options.name)
            // buscar el codigo de la empresa en name
            const parse_codigo = /^EMPRESA: (\d+)/gm.exec(layer.options.name)

            if (parse_codigo) {
                //encontro el codigo, parsear a integer
                const codigo = parseInt(parse_codigo[1]);

                //buscar el codigo de color en empresasManager
                const obj = empresasManager.lotes.find(item => item.codigo === codigo);
                if (obj) {
                    // aplicar el estilo asignado a la empresa
                    layer.options.fillColor = obj.color;
                    layer.options.opacity = 1;
                    layer.options.fillOpacity = 0.7;
                }
            }
            // si es DISPONBLE, aplicar estilo borde negro con fondo blanco
            if (layer.options.name === "DISPONIBLE") {
                layer.options.color = "#000";
                layer.options.opacity = 0.5;
                layer.options.fillOpacity = 0.5;
            }
            // si es RESERVADO, aplicar estilo asignado a "RESERVADO"
            if (layer.options.name === "RESERVADO") {
                const obj = empresasManager.lotes.find(item => item.nombre === "RESERVADO");
                if (obj) {
                    layer.options.fillColor = obj.color;
                    layer.options.opacity = 1;
                    layer.options.fillOpacity = 1;
                }
            }

        })
    },

    _extractStyles: function (xml) {
        let styles = {};
        Array.from(xml.getElementsByTagName("Style")).forEach(style => {
            let id = "#" + style.getAttribute("id");
            styles[id] = this._parseStyle(style);
        });

        Array.from(xml.getElementsByTagName("StyleMap")).forEach(map => {
            let id = "#" + map.getAttribute("id");
            let pairs = Array.from(map.getElementsByTagName("Pair"));
            let normal = pairs.find(p => p.getElementsByTagName("key")[0]?.textContent === "normal");
            if (normal) {
                styles[id] = styles[normal.getElementsByTagName("styleUrl")[0]?.textContent];
            }
        });

        return styles;
    },

    _parseElements: function (xml, options) {
        return Array.from(xml.getElementsByTagName("Placemark")).map(place => {
            let style = this._styles[place.getElementsByTagName("styleUrl")[0]?.textContent] || {};
            return this._parsePlacemark(place, style, options);
        }).filter(layer => layer);
    },

    _parsePlacemark: function (place, style, options) {

        let geom = place.getElementsByTagName("Point")[0] ? this._parsePoint(place, style) :
            place.getElementsByTagName("LineString")[0] ? this._parseLineString(place, style) :
                place.getElementsByTagName("Polygon")[0] ? this._parsePolygon(place, style) :
                    null;
        if (geom) {
            let name = place.getElementsByTagName("name")[0]?.textContent;
            let desc = place.getElementsByTagName("description")[0]?.textContent;
            // si es name === 'Polígono sin título', entonces no mostrar el popup
            name === "Polígono sin título" ? name = "DISPONIBLE" : name

            // etiqueta
            if (name || desc) geom.bindPopup(`<b>${name || ""}</b><br>${desc || ""}`);

            geom.options.name = name;
        }
        return geom;
    },

    _parseStyle: function (style) {
        let lineStyle = style.getElementsByTagName("LineStyle")[0];
        let polyStyle = style.getElementsByTagName("PolyStyle")[0];
        let iconStyle = style.getElementsByTagName("IconStyle")[0];

        let fillOpacity = 0.2;
        let color = "#3388ff";
        let fillColor = "#3388ff";

        if (polyStyle) {
            let kmlColor = polyStyle.getElementsByTagName("color")[0]?.textContent;
            if (kmlColor) {
                let rgba = this._parseColor(kmlColor);
                fillColor = rgba.color;
                fillOpacity = rgba.opacity;
            }
        }

        if (lineStyle) {
            let kmlColor = lineStyle.getElementsByTagName("color")[0]?.textContent;
            if (kmlColor) {
                let rgba = this._parseColor(kmlColor);
                color = rgba.color;
            }
        }

        return {
            color: color,
            weight: lineStyle ? parseFloat(lineStyle.getElementsByTagName("width")[0]?.textContent) || 2 : 2,
            fillColor: fillColor,
            fillOpacity: fillOpacity,
            iconUrl: iconStyle ? iconStyle.getElementsByTagName("href")[0]?.textContent : null,
        };
    },

    _parseColor: function (kmlColor) {
        if (!kmlColor) return {color: "#3388ff", opacity: 0.5};
        let a = parseInt(kmlColor.substr(0, 2), 16) / 255;
        let b = kmlColor.substr(6, 2), g = kmlColor.substr(4, 2), r = kmlColor.substr(2, 2);
        return {
            color: `rgb(${parseInt(r, 16)},${parseInt(g, 16)},${parseInt(b, 16)})`,
            opacity: a,
        };
    },

    _parsePoint: function (place, style) {
        let coords = this._parseCoords(place.getElementsByTagName("coordinates")[0]?.textContent);
        return coords ? L.marker(coords, {icon: this._getIcon(style)}) : null;
    },

    _parseLineString: function (place, style) {
        let coords = this._parseCoords(place.getElementsByTagName("coordinates")[0]?.textContent, true);
        return coords ? L.polyline(coords, style) : null;
    },

    _parsePolygon: function (place, style) {
        let outerBoundary = place.getElementsByTagName("outerBoundaryIs")[0];
        let coords = outerBoundary ? this._parseCoords(outerBoundary.getElementsByTagName("coordinates")[0]?.textContent, true) : null;
        return coords ? L.polygon(coords, {
            color: style.color,
            fillColor: style.fillColor,
            fillOpacity: style.fillOpacity,
            weight: style.weight,
        }) : null;
    },

    _parseCoords: function (coordText, multiple = false) {
        if (!coordText) return null;
        let coords = coordText.trim().split(/\s+/).map(coord => {
            let [lng, lat] = coord.split(",").map(Number);
            return [lat, lng];
        });
        return multiple ? coords : coords[0];
    },

    _getIcon: function (style) {
        return style.iconUrl ? L.icon({
            iconUrl: style.iconUrl,
            iconSize: [32, 32],
        }) : L.icon({iconUrl: "default-icon.png"});
    },
});
L.KMLZonas = L.FeatureGroup.extend({
    initialize: function (kml, options = {}) {
        L.FeatureGroup.prototype.initialize.call(this, []);
        this._parseKML(kml, options);
    },

    _parseKML: function (xml, options) {
        this._styles = this._extractStyles(xml);
        const layers = this._parseElements(xml, options);
        layers.forEach(layer => this.addLayer(layer));

        layers.forEach(layer => {

            if (layer.options.name.includes("Bajo")) {
                layer.options.fillColor = options.colors.verde;
                layer.options.color = options.colors.verde;
                layer.options.opacity = 1;
                layer.options.fillOpacity = 0.7;
            }
            if (layer.options.name.includes("Medio")) {
                layer.options.fillColor = options.colors.azul;
                layer.options.color = options.colors.azul;
                layer.options.opacity = 1;
                layer.options.fillOpacity = 0.7;
            }
            if (layer.options.name.includes("Alto")) {
                layer.options.fillColor = options.colors.naranja;
                layer.options.color = options.colors.naranja;
                layer.options.opacity = 1;
                layer.options.fillOpacity = 0.7;
            }

        })

        // layers.forEach(layer => {
        //     // iterara las capas
        //     console.log(layer.options.name)
        //     // buscar el codigo de la empresa en name
        //     const parse_codigo = /^EMPRESA: (\d+)/gm.exec(layer.options.name)
        //
        //     if (parse_codigo) {
        //         //encontro el codigo, parsear a integer
        //         const codigo = parseInt(parse_codigo[1]);
        //
        //         //buscar el codigo de color en empresasManager
        //         const obj = empresasManager.lotes.find(item => item.codigo === codigo);
        //         if (obj) {
        //             // aplicar el estilo asignado a la empresa
        //             layer.options.fillColor = obj.color;
        //             layer.options.opacity = 1;
        //             layer.options.fillOpacity = 0.7;
        //         }
        //     }
        //     // si es DISPONBLE, aplicar estilo borde negro con fondo blanco
        //     if (layer.options.name === "DISPONIBLE") {
        //         layer.options.color = "#000";
        //         layer.options.opacity = 0.5;
        //         layer.options.fillOpacity = 0.5;
        //     }
        //     // si es RESERVADO, aplicar estilo asignado a "RESERVADO"
        //     if (layer.options.name === "RESERVADO") {
        //         const obj = empresasManager.lotes.find(item => item.nombre === "RESERVADO");
        //         if (obj) {
        //             layer.options.fillColor = obj.color;
        //             layer.options.opacity = 1;
        //             layer.options.fillOpacity = 1;
        //         }
        //     }
        //
        // })
    },

    _extractStyles: function (xml) {
        let styles = {};
        Array.from(xml.getElementsByTagName("Style")).forEach(style => {
            let id = "#" + style.getAttribute("id");
            styles[id] = this._parseStyle(style);
        });

        Array.from(xml.getElementsByTagName("StyleMap")).forEach(map => {
            let id = "#" + map.getAttribute("id");
            let pairs = Array.from(map.getElementsByTagName("Pair"));
            let normal = pairs.find(p => p.getElementsByTagName("key")[0]?.textContent === "normal");
            if (normal) {
                styles[id] = styles[normal.getElementsByTagName("styleUrl")[0]?.textContent];
            }
        });

        return styles;
    },

    _parseElements: function (xml, options) {
        return Array.from(xml.getElementsByTagName("Placemark")).map(place => {
            let style = this._styles[place.getElementsByTagName("styleUrl")[0]?.textContent] || {};
            return this._parsePlacemark(place, style, options);
        }).filter(layer => layer);
    },

    _parsePlacemark: function (place, style, options) {

        let geom = place.getElementsByTagName("Point")[0] ? this._parsePoint(place, style) :
            place.getElementsByTagName("LineString")[0] ? this._parseLineString(place, style) :
                place.getElementsByTagName("Polygon")[0] ? this._parsePolygon(place, style) :
                    null;
        if (geom) {
            let name = place.getElementsByTagName("name")[0]?.textContent;
            let desc = place.getElementsByTagName("description")[0]?.textContent;
            // si es name === 'Polígono sin título', entonces no mostrar el popup
            name === "Polígono sin título" ? name = "DISPONIBLE" : name

            // etiqueta
            if (name || desc) geom.bindPopup(`<b>${name || ""}</b><br>${desc || ""}`);

            geom.options.name = name;
        }
        return geom;
    },

    _parseStyle: function (style) {
        let lineStyle = style.getElementsByTagName("LineStyle")[0];
        let polyStyle = style.getElementsByTagName("PolyStyle")[0];
        let iconStyle = style.getElementsByTagName("IconStyle")[0];

        let fillOpacity = 0.2;
        let color = "#3388ff";
        let fillColor = "#3388ff";

        if (polyStyle) {
            let kmlColor = polyStyle.getElementsByTagName("color")[0]?.textContent;
            if (kmlColor) {
                let rgba = this._parseColor(kmlColor);
                fillColor = rgba.color;
                fillOpacity = rgba.opacity;
            }
        }

        if (lineStyle) {
            let kmlColor = lineStyle.getElementsByTagName("color")[0]?.textContent;
            if (kmlColor) {
                let rgba = this._parseColor(kmlColor);
                color = rgba.color;
            }
        }

        return {
            color: color,
            weight: lineStyle ? parseFloat(lineStyle.getElementsByTagName("width")[0]?.textContent) || 2 : 2,
            fillColor: fillColor,
            fillOpacity: fillOpacity,
            iconUrl: iconStyle ? iconStyle.getElementsByTagName("href")[0]?.textContent : null,
        };
    },

    _parseColor: function (kmlColor) {
        if (!kmlColor) return {color: "#3388ff", opacity: 0.5};
        let a = parseInt(kmlColor.substr(0, 2), 16) / 255;
        let b = kmlColor.substr(6, 2), g = kmlColor.substr(4, 2), r = kmlColor.substr(2, 2);
        return {
            color: `rgb(${parseInt(r, 16)},${parseInt(g, 16)},${parseInt(b, 16)})`,
            opacity: a,
        };
    },

    _parsePoint: function (place, style) {
        let coords = this._parseCoords(place.getElementsByTagName("coordinates")[0]?.textContent);
        return coords ? L.marker(coords, {icon: this._getIcon(style)}) : null;
    },

    _parseLineString: function (place, style) {
        let coords = this._parseCoords(place.getElementsByTagName("coordinates")[0]?.textContent, true);
        return coords ? L.polyline(coords, style) : null;
    },

    _parsePolygon: function (place, style) {
        let outerBoundary = place.getElementsByTagName("outerBoundaryIs")[0];
        let coords = outerBoundary ? this._parseCoords(outerBoundary.getElementsByTagName("coordinates")[0]?.textContent, true) : null;
        return coords ? L.polygon(coords, {
            color: style.color,
            fillColor: style.fillColor,
            fillOpacity: style.fillOpacity,
            weight: style.weight,
        }) : null;
    },

    _parseCoords: function (coordText, multiple = false) {
        if (!coordText) return null;
        let coords = coordText.trim().split(/\s+/).map(coord => {
            let [lng, lat] = coord.split(",").map(Number);
            return [lat, lng];
        });
        return multiple ? coords : coords[0];
    },

    _getIcon: function (style) {
        return style.iconUrl ? L.icon({
            iconUrl: style.iconUrl,
            iconSize: [32, 32],
        }) : L.icon({iconUrl: "default-icon.png"});
    },
});