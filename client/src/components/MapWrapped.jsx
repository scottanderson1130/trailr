/* eslint-disable no-use-before-define */
import React, { useEffect, useState } from 'react';
import isEmpty from 'lodash.isempty';
import { Link } from 'react-router-dom';
import MarkerClusterer from '@google/markerclusterer';
import axios from 'axios';
import Marker from './Marker.jsx';
import InfoWindow from './InfoWindow.jsx';
import GoogleMap from './GoogleMap.jsx';
import SearchBox from './SearchBox.jsx';
import transparentMarker from '../../assets/imgs/transparentMarker.png';
import WeatherBar from './WeatherBar.jsx'
import * as trailData from '../data/trail-data.json';

/**
 * MapWithASearchBox is an Google Map with an auto-completing search bar that searches
 * suggested locations from Google Maps API. After a certain range
 * @param {Array} photos an array of photo information
 * @param {Number} currentPhoto a number representing the location of the current photo
 * @param {Function} changeCurrentPhoto a function that changes the current photo
 */

const MapWithASearchBox = React.memo(({ getLocation }) => {
  const [mapApiLoaded, setMapApiLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);
  const [mapApi, setMapApi] = useState(null);
  const [places, setPlaces] = useState(trailData.data);
  const [userLocation, setUserLocation] = useState({
    lat: 30.0766974,
    lng: -89.8788793,
  });
  const [selectedTrail, setSelectedTrail] = useState(null);
  const [selectedTrailIndex, setSelectedTrailIndex] = useState(null);

  const getInput = (data) => {
    console.info(data)
  };

  const addPlace = (place) => {
    setPlaces(place);
  };

  const clearSelectedTrail = () => {
    setSelectedTrail(null);
    setSelectedTrailIndex(null);
  };

  const updateTrails = (radius, lat, lng) => {
    const strungRadius = radius.toString();
    const strungLat = lat.toString();
    const strungLng = lng.toString();
    axios
      .get('/api/trails', {
        params: {
          radius: strungRadius,
          lat: strungLat,
          lon: strungLng,
        },
      })
      .then(({ data }) => {
        if (places) {
          setPlaces(data);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  };

  useEffect(() => {
    updateTrails(100, userLocation.lat, userLocation.lng);
    const script = document.createElement('script');
    script.src = 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/markerclusterer.js';
    script.async = true;
    document.body.appendChild(script);

    const listener = (e) => {
      if (e.key === 'Escape') {
        clearSelectedTrail();
      }
    };
    window.addEventListener('keydown', listener);

    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      setUserLocation({ lat: latitude, lng: longitude });
    });

    return () => {
      window.removeEventListener('keydown', listener);
      document.body.removeChild(script);
    };
  }, []);

  /**
   * setGoogleMapRef creates listeners on the current map, so that when the bounds
   * of the map are moved far enough away from the last search call, it creates
   * new search call based on the map's new current center. Also, prepares sets up
   * MarkerClusterer given the last trails retrieved from the last search call.
   */
  const setGoogleMapRef = (map, maps) => {
    if (map && maps) {
      let lastSearchedCenter = lastSearchedCenter || userLocation;
      map.addListener('bounds_changed', () => {
        const currentBounds = map.getBounds();
        const currentCenter = {
          lat: (currentBounds.Sa.i + currentBounds.Sa.j) / 2,
          lng: (currentBounds.Ya.i + currentBounds.Ya.j) / 2,
        };

        // used to get the current search location 
        getLocation(currentCenter);
        const range = 1.2; // lat/lon degrees needed to change in order to search again
        const radius = 100; // search radius in miles
        if (
          Math.abs(+currentCenter.lat - +lastSearchedCenter.lat) > range
          || Math.abs(+currentCenter.lng - +lastSearchedCenter.lng) > range
        ) {
          lastSearchedCenter = currentCenter;
          updateTrails(radius, currentCenter.lat, currentCenter.lng);
        }
      });
      setMapInstance(map);
      setMapApi(maps);
      setMapApiLoaded(true);
      const googleRef = maps;
      /**
       * Uses @google/markerclusterer. We use current locations of trails
       * with lat/lng instead of lat/lon and create Marker Clusters.
       */
      if (places) {
        const locations = places.reduce((coordinates, currentTrail) => {
          coordinates.push({ lat: +currentTrail.lat, lng: +currentTrail.lon });
          return coordinates;
        }, []);
        const markers = locations
        && locations.map((location) => new googleRef.Marker({
          position: location,
          icon: transparentMarker,
        }));
<<<<<<< HEAD
=======
        // took new keyword off maybe breaks something //
>>>>>>> b0fe317... [Feature] Build Weather Component container and add to Home.
        new MarkerClusterer(map, markers, {
          imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
          gridSize: 15,
          minimumClusterSize: 2,
        });
      }
    }
  };

  useEffect(() => {
    setGoogleMapRef(mapInstance, mapApi);
  }, [places]);

  return (
    <>
      {mapApiLoaded && (
        <SearchBox
          map={mapInstance}
          mapApi={mapApi}
          places={places}
          addplace={addPlace}
          getInput={getInput}
        />
      )}
      <div className="mb-3">
        <WeatherBar
          userLocation={userLocation}
        />
      </div>
      <GoogleMap
        defaultZoom={10}
        defaultCenter={{
          lat: 30.0648498,
          lng: -89.8788793,
        }}
        center={userLocation}
        bootstrapURLKeys={{
          key: process.env.GOOGLE_MAPS_API_KEY,
          libraries: ['places', 'geometry'],
        }}
        yesIWantToUseGoogleMapApiInternals
        onGoogleApiLoaded={({ map, maps }) => setGoogleMapRef(map, maps)}
        options={{ streetViewControl: false }}
      >
        {!isEmpty(places)
          && places.map((place, i) => (
            <Marker
              color={i === selectedTrailIndex ? 'green' : 'blue'}
              key={place.id}
              text={place.name}
              size={28}
              lat={place.lat || place.geometry.location.lat()}
              lng={place.lon || place.geometry.location.lng()}
              clickHandler={() => {
                // console.log('is this i?', i);
                if (selectedTrailIndex === i) {
                  clearSelectedTrail();
                } else {
                  setSelectedTrail(place);
                  setSelectedTrailIndex(i);
                }
              }}
            />
          ))}
        {selectedTrail && (
          <InfoWindow
            selectedTrail={selectedTrail}
            onCloseClick={() => {
              clearSelectedTrail();
            }}
            position={{
              lat: +selectedTrail.lat,
              lng: +selectedTrail.lon,
            }}
          >
            <div>
              <Link to={`/trail/${selectedTrail.id}`} activeclassname="active">
                <h2>{selectedTrail.name}</h2>
              </Link>
              <p>{selectedTrail.length} miles</p>
              <p>{selectedTrail.description}</p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </>
  );
});

export default MapWithASearchBox;
