(function($,L){

	
	// default options
	var defaults = {
		width: '300px',
		height: '200px',
		lat:51.3,
		lng:0.7,
		sep:',',
		zoom: 9,
		single: false,
		fitBounds: {padding:[50,50]},
		area: null
		}

	// is visible
	var showing = false;
	
	// leaflet instance
	var map = null;
	//var marker = null;
	
	// current active input
	var input_current = null;

	// methods object
  var methods = {
		// init function
		init : function(options){
			var opt = $.extend( defaults, options );
			
			// make leaflet frame first
			var area_exists = $('.locationpicker_area').length;
			var area_id = 'locationpicker_area';
			if(area_exists > 0) area_id += '_' + area_exists;
			area = (opt.area) ? opt.area : $('<div>',{id:area_id,class:'locationpicker_area'}).css({width:opt.width, height:opt.height, position:'absolute', background:'#888'}).appendTo('body');//.hide()
			area.data().x1 = area.data().x2 = area.data().y1 = area.data().y2 = null;
			// leaflet instance
			map = L.map(area_id); methods.leaflet_init.call(this,map,opt);
			map.on('click',methods.leaflet_place_marker);
			if(!opt.area) area.hide();
			
			area.data().map = map;
			area.data().fitBounds_single = this.length==1;
				/**
				 * exterlan clicks: hide map
				 * */
				$(document).mousedown(function(e){
					if(input_current !== null){
						var area = input_current.data().area;
						if ( area.css('display') != 'none'){
							var target = $(e.target);
							if(e.target != input_current[0]) methods.area_hide.call(this);
							}
						}
					});
			// foreach inputs
			return this.filter('input').each(function(i){
				var el = $(this);
				el.data().opt = opt;
				// skip binded elements
				if ( !!el.data().locationpicked ) return;
				el.data().map = map;
				// attach marker
				var marker_options = {draggable: true}
				var marker = new L.marker([opt.lat,opt.lng],marker_options);
				el.data().marker = marker;
				el.data().area = area;
				marker.on('drag dragend',methods.save_location);
				marker.el = el;
				if(this.title) marker.bindPopup(this.title)
				methods.parse_location.call(this);
				// fit Bounds !
				if(latlng = el.data().latlng){
					area.data().x1 = (i) ? Math.max.apply(null,[area.data().x1,latlng.lat]) : latlng.lat;
					area.data().y1 = (i) ? Math.max.apply(null,[area.data().y1,latlng.lng]) : latlng.lng;
					area.data().x2 = (i) ? Math.min.apply(null,[area.data().x2,latlng.lat]) : latlng.lat;
					area.data().y2 = (i) ? Math.min.apply(null,[area.data().y2,latlng.lng]) : latlng.lng;
					marker.addTo(map);
					}
				area.data().fit_it = !!opt.fitBounds;// methods.leaflet_fitBounds.call(this);
				/**
				 * bind events
				 * */
				el.on('click focus',function(e){
					if(input_current) input_current.data().marker.closePopup();
					el = input_current = $(this);
					el.data().marker.openPopup();
					if ( showing ) return; // else - set position and show =)
					// set map view
					methods.area_show.call(this);
				}).on('keyup change',function(e){
					console.log(e)
					if(this.value)
						methods.parse_location.call(this);
					else{
						var el = $(this), data = el.data(), map = data.map, marker = data.marker;
						map.removeLayer(marker);
						}
					});
				
				el.data().locationpicked = true;
				});
			},
		// add layers to map and others
		leaflet_init : function(map, opt){
			var el = $(this);
			// make tile layer
			var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
			var mbxUrl = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6IjZjNmRjNzk3ZmE2MTcwOTEwMGY0MzU3YjUzOWFmNWZhIn0.Y8bhBaUMqFiPrDRW9hieoQ';
			var osmAttrib='Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors';
			var osm = new L.TileLayer(osmUrl, {minZoom: 4, maxZoom: 13, attribution: osmAttrib});
			//add to map
			var latlng = new L.LatLng(opt.lat,opt.lng);
			map.setView(latlng,opt.zoom);
			map.addLayer(osm);
			//map.addLayer(mbxUrl);
			/*marker_options = {draggable: true}
			marker = new L.marker([opt.lat,opt.lng],marker_options).addTo(map);
			marker.on('drag dragend',methods.save_location);*/
			// search engine
			/*new L.Control.GeoSearch({
				provider: new L.GeoSearch.Provider.Google()
				}).addTo(map);*/
			},
		area_show: function(){
			var el = $(this);
			var area = el.data().area;
			var pos = methods.find_best_position(this);
			area.css(pos).addClass('locationpicker-active');
			area.data().showing = true;
			area.show();
			if(area.data().fit_it) methods.leaflet_fitBounds.call(this);
			return el;
			},
		area_hide: function(){
			var el = input_current;
			if(input_current !== undefined){
				var opt = el.data().opt;
				var area = el.data().area;
				area.removeClass('locationpicker-active')
				area.data().showing = showing = false;
				}
			return (opt.area) ?  area : area.hide(); 
			},
		parse_location: function(){
			var el = $(this);
			var map = el.data().map;
			var sep = el.data().opt.sep;
			var sep = ',';
			var val = el.val().toString().split(sep);
			var marker = el.data().marker;
			//val[0]*=1; val[1]*=1;
			if(typeof(val[0]) == 'string' && val[0] == val[0]*1 && typeof(val[1]) == 'string' && val[1] == val[1]*1 /*&&val[0] !== NaN && val[1] !== NaN && typeof(val[0]) == 'number' && typeof(val[1]) == 'number'*/)// typeof(val[0]*1) == 'number' && typeof(val[1]) == 'number'
				{
				var latlng = new L.LatLng(val[0],val[1]);
				marker.setLatLng(latlng);
				if(!marker._map)
					marker.addTo(map);
				el.data().latlng = latlng;
			}else{
				}
			},
		save_location: function(e){
			var el = this.el, marker = el.data().marker;
			console.log([this,e]);
			var loc = marker.getLatLng();
			// set value
			var val = loc.lat + el.data().opt.sep + loc.lng;
			el.val(val);
			el.data().latlng = latlng;
			},
		leaflet_fitBounds: function(){
			var el = $(this);
			var area = el.data().area, data = area.data(), opt = el.data().opt;
			//console.log([this,el,area])
			if(data.x1 && data.y1 && data.x2 && data.y2){// && data.x1 != data.x2 && data.y1 != data.y2
				var southWest = new L.LatLng(data.x1,data.y1);
				var northEast = new L.LatLng(data.x2,data.y2);
				var bounds = new L.LatLngBounds(southWest, northEast);
				if(data.fitBounds_single) opt.fitBounds.maxZoom = opt.zoom;
				el.data().map.fitBounds(bounds,opt.fitBounds);
				area.data().fit_it = false;
			}
			//if(data.fitBounds_single) return el.data().map.panTo(el.data().marker.getLatLng(),{animate:true});
			return el;
			},
		leaflet_setView: function(map,ll_str,z){},
		leaflet_place_marker: function(e){
				var el = input_current, marker = el.data().marker, map = el.data().map;
				// place marker
				marker.setLatLng(e.latlng);
				//console.log(e.latlng)
				marker.addTo(map);
				methods.save_location.call(marker,e);
			},
		find_best_position: function(){
			var coords;
			var
				// top-left corner of browser viewpoint relative to document
				// координаты левого верхнего угла окна браузера в пространстве документа
				sx = $(document).scrollLeft(),
				sy = $(document).scrollTop(),
				// bottom-right corner of browser viewpoint relative to document
				// координаты правого нижнего угла окна браузера в пространстве документа
				bx = window.innerWidth + sx,
				by = window.innerHeight + sy;
				// координаты прямоугольника внутри координатной системы документа, часть которого видна в окне браузера (viewport)
				var windowRect = {left: sx, top: sy, right: bx, bottom: by};
				// проверяет, находится ли innerRect целиком в outerRect
			// try to place under input first
      coords = { left: input_current.offset().left, top: input_current.offset().top + input_current.outerHeight() }
			//console.log(coords)
			// or make float left
			if(coords.top + input_current.data().area.outerHeight() > by){
				console.log('off!')
				coords = {left: input_current.offset().left + input_current.outerWidth(), top: by - input_current.data().area.outerHeight() }
				}
			// fix hs bug ]:-)
			coords.left = Math.round(coords.left)
			coords.top = Math.round(coords.top)
			//console.log(coords)
			return coords;
			}
		}


  $.fn.locationpicker = function(method) {
    if ( methods[method] ) {
      return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
    } else if ( typeof method === 'object' || ! method ) {
      return methods.init.apply( this, arguments );
    } else {
      $.error( 'Метод ' +  method + ' не существует в jQuery.editors' );
    }
  };

})( jQuery, L );
