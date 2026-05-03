
"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Custom icons for Start and End points
const StartIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const EndIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface RouteMapProps {
  routes: any[];
  selectedRouteIndex: number;
  fromCoords: [number, number];
  toCoords: [number, number];
  onRouteSelect: (index: number) => void;
}

function FitBounds({ from, to, selectedRoute }: { from: [number, number]; to: [number, number]; selectedRoute?: any }) {
  const map = useMap();

  useEffect(() => {
    if (!from || !to) return;

    const bounds = L.latLngBounds([from, to]);
    
    // If a route is selected, include its geometry to ensure it fits perfectly
    if (selectedRoute && selectedRoute.geometry && selectedRoute.geometry.coordinates) {
      selectedRoute.geometry.coordinates.forEach((coord: [number, number]) => {
        bounds.extend([coord[1], coord[0]]);
      });
    }

    map.fitBounds(bounds, {
      padding: [40, 40],
      animate: true,
      duration: 1.5,
      easeLinearity: 0.25
    });
  }, [from, to, selectedRoute, map]);

  return null;
}

export function RouteMap({ routes, selectedRouteIndex, fromCoords, toCoords, onRouteSelect }: RouteMapProps) {
  const selectedRoute = routes[selectedRouteIndex];

  return (
    <div className="w-full h-[450px] rounded-xl overflow-hidden shadow-2xl border relative group">
      <MapContainer 
        center={fromCoords} 
        zoom={13} 
        scrollWheelZoom={true} 
        className="h-full w-full"
      >
        <FitBounds from={fromCoords} to={toCoords} selectedRoute={selectedRoute} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Render all potential routes */}
        {routes.map((route, index) => (
          <Polyline
            key={`${index}-${selectedRouteIndex}`}
            positions={route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]])}
            color={index === selectedRouteIndex ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.4)"}
            weight={index === selectedRouteIndex ? 7 : 4}
            opacity={index === selectedRouteIndex ? 1 : 0.4}
            dashArray={index === selectedRouteIndex ? "" : "5, 10"}
            eventHandlers={{
              click: () => onRouteSelect(index),
            }}
            className="cursor-pointer transition-all duration-300"
          />
        ))}

        <Marker position={fromCoords} icon={StartIcon}>
          <Popup className="font-medium">Departure Point</Popup>
        </Marker>
        
        <Marker position={toCoords} icon={EndIcon}>
          <Popup className="font-medium">Destination</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
