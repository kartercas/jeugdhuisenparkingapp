angular.module('parkingapp.controllers', ['leaflet-directive', 'ionic'])

.controller('MapController', function($scope, $rootScope, $timeout, StorageService, AddressService, ZoneService){
	/*var center = StorageService.getObject('center');
	// defaults to 'grote markt'
	if(JSON.stringify(center) == '{}') {
		center.lat = 51.221311;
		center.lng = 4.399160;
	}*/
	
	var c = {};
	if($rootScope.foundAddress){
		c = $rootScope.foundAddress;
	}
	else{
		c.lat = 51.221311;
		c.lng = 4.399160;
	}
	
	
	var map = {
		defaults: {
			// MapQuest
			tileLayer: 'http://otile4.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png',
			// OpenStreetMap
			//tileLayer: 'http://{s}.tile.osm.org/{z}/{x}/{y}.png',
			maxZoom: 20,
			zoomControl: false,
			doubleClickZoom: false,
			scrollWheelZoom: true,
			touchZoom: true,
			path: {
				weight: 10,
				color: '#800000',
				opacity: 1
			}
		},
		//markers: StorageService.getObject('mapMarkers'),
		markers: [],
		center: {
			lat: c.lat,
			lng: c.lng,
			zoom: 17
		}
	};

	$scope.map = map;
	var markerCount = 0;
	// Request object parkingZones from StorageService
	// If the object does not yet exist, then pull it from server
	var zones = StorageService.getObject('parkingZones');
	if (JSON.stringify(zones) === '{}') {
		ZoneService.getZones().then(function(z) {
			zones = z;
			StorageService.setObject('parkingZones', zones);
			console.log(zones);
		});
	}

	// normal click
	$scope.$on('leafletDirectiveMap.click', function(event, locationEvent){
		setTimeout(addMarker(locationEvent), 1000);
	});

	// double click
	// $scope.$on('leafletDirectiveMap.dblclick', function(event, locationEvent){ });

	// right-click
	$scope.$on('leafletDirectiveMap.contextmenu', function(event, locationEvent){
		$scope.map.markers = [];
    	$scope.markerCount = 0;
    	StorageService.setObject('mapMarkers', $scope.map.markers);
	});

	setTitle = function(msg){
		document.getElementById('title').innerHTML = '<h1 class="title">' + msg + '</h1>';
	};

	locate = function(){
		setTitle('Even geduld, positie wordt bepaald...');
		navigator.geolocation.getCurrentPosition(function(position){
			var center = {
				lat: position.coords.latitude,
				lng: position.coords.longitude,
				zoom : 17
			};
			$timeout(function(){
        		$scope.map.center = center;
        		setTitle('');
    		}, 3000);
			StorageService.setObject('center', center);
		}, function(err){ console.log(err); });
	};

	/* http://alienryderflex.com/polygon/
	The basic idea is to find all edges of the polygon that span the 'x' position of the point you're testing against. 
	Then you find how many of them intersect the vertical line that extends above your point. If an even number cross above the point, 
	then you're outside the polygon. If an odd number crosses above, then you're inside. */
	inPolygon = function(location, polyLoc){
		//console.log(location);
		//console.log(polyLoc);
		var lastPoint = polyLoc[polyLoc.length-1];
		var isInside = false;
		var x = location[0];

		for(var i = 0; i < polyLoc.length; i++){
			var point = polyLoc[i];
			var x1 = lastPoint[0];
			var x2 = point[0];
			var dx = x2 - x1;
			
			if(Math.abs(dx) > 180.0){
				if(x > 0){
					while(x1 < 0)
						x1 += 360;
					while(x2 < 0)
						x2 += 360;
				}
				else{
					while(x1 > 0)
						x1 -= 360;
					while(x2 > 0)
						x2 -= 360;
				}
				dx = x2 - x1;
			}
			
			if((x1 <= x && x2 > x) || (x1 >= x && x2 < x)){
				var grad = (point[1] - lastPoint[1]) / dx;
				var intersectAtLat = lastPoint[1] + ((x - x1) * grad);

				if(intersectAtLat > location[1])
					isInside = !isInside;
			}
			lastPoint = point;
		}
		//console.log(isInside);
		return isInside;
	};

	addMarker = function(locationEvent) {
		var lat = locationEvent.leafletEvent.latlng.lat;
		var lng = locationEvent.leafletEvent.latlng.lng;
		var tariff;
		//console.log(zones);
		for (var i = 0; i < zones.length; i++) {
			if( i == 1) {
			console.log(zones[i]);}
			var geo = JSON.parse(zones[i].geometry);
			var coordinates = geo.coordinates[0];
			console.log(coordinates);
			if (inPolygon([lng, lat], coordinates)) {
				tariff = zones[i].tariefkleur;
				//console.log(tariff);
				break;
			}
		}
		
		AddressService.getAddress(lat, lng).then(function(data) {
			if (data.address.road != undefined) {
				console.log(data.address);
				var marker = {
					lat: lat,
					lng: lng,
					message: data.address.road + ' / ' + tariff,
					focus: true,
					draggable: false
				};
				$scope.map.markers[markerCount] = marker;
				markerCount++;
			}
		});
	};
})

.controller('DataController', function($scope, $rootScope, $timeout, $http, $location, AddressService){
	setTitle = function(msg){
		document.getElementById('title').innerHTML = '<h1 class="title">' + msg + '</h1>';
	};
	$scope.search = {};
	$rootScope.foundAddress = {};
	
	$scope.searchAddress = function() {
		console.log($scope.search.address);
		AddressService.getCoordinates($scope.search.address).then(function(data) {
			$rootScope.foundAddress.lat = parseFloat(data[0].lat);
			$rootScope.foundAddress.lng = parseFloat(data[0].lon);
			$location.path("#/tab/map");
		});
	}
});