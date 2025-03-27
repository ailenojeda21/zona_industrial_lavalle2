/*!
 * Copyright (c) 2011-2015, Pavel Shramov, Bruno Bergot - MIT licence
 */

L.KML = L.FeatureGroup.extend({
	initialize: function (kml, options) {
		this._kml = kml;
		this._layers = {};
		this._options = options;

		if (kml) {
			this.addKML(kml, options);
		}
	},

	addKML: function (xml, options) {
		var layers = L.KML.parseKML(xml, options);
		if (!layers || !layers.length) return;
		for (var i = 0; i < layers.length; i++) {
			this.fire('addlayer', {
				layer: layers[i]
			});
			this.addLayer(layers[i]);
		}
		this.latLngs = L.KML.getLatLngs(xml);
		this.fire('loaded');
	},

	latLngs: []
});

L.Util.extend(L.KML, {
	parseKML: function (xml, options) {
		var style = this.parseStyles(xml, options);
		this.parseStyleMap(xml, style);
		var el = xml.getElementsByTagName('Folder');
		var layers = [], l;
		for (var i = 0; i < el.length; i++) {
			if (!this._check_folder(el[i])) { continue; }
			l = this.parseFolder(el[i], style);
			if (l) { layers.push(l); }
		}
		el = xml.getElementsByTagName('Placemark');
		for (var j = 0; j < el.length; j++) {
			if (!this._check_folder(el[j])) { continue; }
			l = this.parsePlacemark(el[j], xml, style);
			if (l) { layers.push(l); }
		}
		el = xml.getElementsByTagName('GroundOverlay');
		for (var k = 0; k < el.length; k++) {
			l = this.parseGroundOverlay(el[k]);
			if (l) { layers.push(l); }
		}
		return layers;
	},

	// Return false if e's first parent Folder is not [folder]
	// - returns true if no parent Folders
	_check_folder: function (e, folder) {
		e = e.parentNode;
		while (e && e.tagName !== 'Folder')
		{
			e = e.parentNode;
		}
		return !e || e === folder;
	},

	parseStyles: function (xml, options) {
		var styles = {};
		var sl = xml.getElementsByTagName('Style');
		for (var i = 0, len = sl.length; i < len; i++) {
			var style = this.parseStyle(sl[i], options);
			if (style) {
				var styleName = '#' + style.id;
				styles[styleName] = style;
			}
		}
		return styles;
	},

	parseStyle: function (xml, options) {
		var style = {}, poptions = {}, ioptions = {}, el, id;

		var attributes = {color: true, width: true, Icon: true, href: true, hotSpot: true};

		function _parse (xml) {
			var options = {};
			for (var i = 0; i < xml.childNodes.length; i++) {
				var e = xml.childNodes[i];
				var key = e.tagName;
				if (!attributes[key]) { continue; }
				if (key === 'hotSpot')
				{
					for (var j = 0; j < e.attributes.length; j++) {
						options[e.attributes[j].name] = e.attributes[j].nodeValue;
					}
				} else {
					var value = e.childNodes[0].nodeValue;
					if (key === 'color') {
						options.opacity = parseInt(value.substring(0, 2), 16) / 255.0;
						options.color = '#' + value.substring(6, 8) + value.substring(4, 6) + value.substring(2, 4);
					} else if (key === 'width') {
						options.weight = parseInt(value);
					} else if (key === 'Icon') {
						ioptions = _parse(e);
						if (ioptions.href) { options.href = ioptions.href; }
					} else if (key === 'href') {
						options.href = value;
					}
				}
			}
			return options;
		}

		el = xml.getElementsByTagName('LineStyle');
		if (el && el[0]) { style = _parse(el[0]); }
		el = xml.getElementsByTagName('PolyStyle');
		if (el && el[0]) { poptions = _parse(el[0]); }
		if (poptions.color) { style.fillColor = poptions.color; }
		if (poptions.opacity) { style.fillOpacity = poptions.opacity; }
		el = xml.getElementsByTagName('IconStyle');
		if (el && el[0]) { ioptions = _parse(el[0]); }
		if (ioptions.href) {
			style.icon = new L.KMLIcon({
				iconUrl: ioptions.href,
				shadowUrl: null,
				anchorRef: {x: ioptions.x, y: ioptions.y},
				anchorType: {x: ioptions.xunits, y: ioptions.yunits}
			});
		}

		id = xml.getAttribute('id');
		if (id && style) {
			style.id = id;
		}

		return style;
	},

	parseStyleMap: function (xml, existingStyles) {
		var sl = xml.getElementsByTagName('StyleMap');

		for (var i = 0; i < sl.length; i++) {
			var e = sl[i], el;
			var smKey, smStyleUrl;

			el = e.getElementsByTagName('key');
			if (el && el[0]) { smKey = el[0].textContent; }
			el = e.getElementsByTagName('styleUrl');
			if (el && el[0]) { smStyleUrl = el[0].textContent; }

			if (smKey === 'normal')
			{
				existingStyles['#' + e.getAttribute('id')] = existingStyles[smStyleUrl];
			}
		}

		return;
	},

	parseFolder: function (xml, style) {
		var el, layers = [], l;
		el = xml.getElementsByTagName('Folder');
		for (var i = 0; i < el.length; i++) {
			if (!this._check_folder(el[i], xml)) { continue; }
			l = this.parseFolder(el[i], style);
			if (l) { layers.push(l); }
		}
		el = xml.getElementsByTagName('Placemark');
		for (var j = 0; j < el.length; j++) {
			if (!this._check_folder(el[j], xml)) { continue; }
			l = this.parsePlacemark(el[j], xml, style);
			if (l) { layers.push(l); }
		}
		el = xml.getElementsByTagName('GroundOverlay');
		for (var k = 0; k < el.length; k++) {
			if (!this._check_folder(el[k], xml)) { continue; }
			l = this.parseGroundOverlay(el[k]);
			if (l) { layers.push(l); }
		}
		if (!layers.length) { return; }
		if (layers.length === 1) { return layers[0]; }
		return new L.FeatureGroup(layers);
	},

	parsePlacemark: function (place, xml, style, options) {
		var h, i, j, k, el, il, opts = options || {};

		el = place.getElementsByTagName('styleUrl');
		var styleUrl = '';
		if (el && el[0]) { styleUrl = el[0].textContent; }
		var defaultStyle = style['#' + styleUrl] || {};

		var layers = [];

		var parse = ['LineString', 'Polygon', 'Point'];
		for (j in parse) {
			var tag = parse[j];
			el = place.getElementsByTagName(tag);
			for (i = 0; i < el.length; i++) {
				var l = this['parse' + tag](el[i], xml, defaultStyle);
				if (l) { layers.push(l); }
			}
		}

		if (!layers.length) {
			return;
		}
		var layer = layers[0];
		if (layers.length > 1) {
			layer = new L.FeatureGroup(layers);
		}

		var name, descr = '';
		el = place.getElementsByTagName('name');
		if (el.length && el[0].childNodes.length) {
			name = el[0].childNodes[0].nodeValue;
		}
		el = place.getElementsByTagName('description');
		for (i = 0; i < el.length; i++) {
			for (j = 0; j < el[i].childNodes.length; j++) {
				descr = descr + el[i].childNodes[j].nodeValue;
			}
		}

		if (name) {
			layer.on('add', function () {
				layer.bindPopup('<h2>' + name + '</h2>' + descr);
			});
		}

		return layer;
	},

	parseCoords: function (xml) {
		var el = xml.getElementsByTagName('coordinates');
		return this._read_coords(el[0]);
	},

	parseLineString: function (line, xml, style) {
		var coords = this.parseCoords(line);
		if (!coords.length) { return; }
		return new L.Polyline(coords, style);
	},

	parsePoint: function (line, xml, style) {
		var el = line.getElementsByTagName('coordinates');
		if (!el.length) {
			return;
		}
		var ll = el[0].childNodes[0].nodeValue.split(',');
		return new L.KMLMarker(new L.LatLng(ll[1], ll[0]), style);
	},

	parsePolygon: function (line, xml, style) {
		var el, polys = [], inner = [], i, coords;
		el = line.getElementsByTagName('outerBoundaryIs');
		for (i = 0; i < el.length; i++) {
			coords = this.parseCoords(el[i]);
			if (coords) {
				polys.push(coords);
			}
		}
		el = line.getElementsByTagName('innerBoundaryIs');
		for (i = 0; i < el.length; i++) {
			coords = this.parseCoords(el[i]);
			if (coords) {
				inner.push(coords);
			}
		}
		if (!polys.length) {
			return;
		}
		if (style.fillColor) {
			style.fill = true;
		}
		if (polys.length === 1) {
			return new L.Polygon(polys.concat(inner), style);
		}
		return new L.MultiPolygon(polys, style);
	},

	getLatLngs: function (xml) {
		var el = xml.getElementsByTagName('coordinates');
		var coords = [];
		for (var j = 0; j < el.length; j++) {
			var coord = this._read_coords(el[j]);
			for (var i = 0, len = coord.length; i < len; i++) {
				var ll = coord[i];
				coords.push(L.latLng(ll[1], ll[0]));
			}
		}
		return coords;
	},

	_read_coords: function (el) {
		var text = '', coords = [], i;
		for (i = 0; i < el.childNodes.length; i++) {
			text = text + el.childNodes[i].nodeValue;
		}
		text = text.split(/[\s\n]+/);
		for (i = 0; i < text.length; i++) {
			var ll = text[i].split(',');
			if (ll.length < 2) {
				continue;
			}
			coords.push([parseFloat(ll[0]), parseFloat(ll[1])]);
		}
		return coords;
	},

	parseGroundOverlay: function (xml) {
		var latlonbox = xml.getElementsByTagName('LatLonBox')[0];
		var bounds = new L.LatLngBounds(
			[
				parseFloat(latlonbox.getElementsByTagName('south')[0].childNodes[0].nodeValue),
				parseFloat(latlonbox.getElementsByTagName('west')[0].childNodes[0].nodeValue)
			],
			[
				parseFloat(latlonbox.getElementsByTagName('north')[0].childNodes[0].nodeValue),
				parseFloat(latlonbox.getElementsByTagName('east')[0].childNodes[0].nodeValue)
			]
		);
		var attributes = {Icon: true, href: true};
		function _parse (xml) {
			var options = {}, ioptions = {};
			for (var i = 0; i < xml.childNodes.length; i++) {
				var e = xml.childNodes[i];
				var key = e.tagName;
				if (!attributes[key]) { continue; }
				var value = e.childNodes[0].nodeValue;
				if (key === 'Icon') {
					ioptions = _parse(e);
					if (ioptions.href) { options.href = ioptions.href; }
				} else if (key === 'href') {
					options.href = value;
				}
			}
			return options;
		}
		var options = {};
		options = _parse(xml);
		if (options.href) {
			return new L.GroundOverlay(options.href, bounds);
		}
	}
});

L.KMLIcon = L.Icon.extend({
	options: {
		iconSize: [32, 32],
		iconAnchor: [16, 16],
	},
	_setIconStyles: function (img, name) {
		L.Icon.prototype._setIconStyles.apply(this, [img, name]);
		if( img.complete ) {
			this.applyCustomStyles( img )
		} else {
			img.onload = this.applyCustomStyles.bind(this,img)
		}
	},
	applyCustomStyles: function(img) {
		var options = this.options;
		var width = options.iconSize[0];
		var height = options.iconSize[1];

		this.options.popupAnchor = [0,(-0.83*height)];
		if (options.anchorType.x === 'fraction')
			img.style.marginLeft = (-options.anchorRef.x * width) + 'px';
		if (options.anchorType.y === 'fraction')
			img.style.marginTop  = ((-(1 - options.anchorRef.y) * height) + 1) + 'px';
		if (options.anchorType.x === 'pixels')
			img.style.marginLeft = (-options.anchorRef.x) + 'px';
		if (options.anchorType.y === 'pixels')
			img.style.marginTop  = (options.anchorRef.y - height + 1) + 'px';
	}
});


L.KMLMarker = L.Marker.extend({
	options: {
		icon: new L.KMLIcon.Default()
	}
});
