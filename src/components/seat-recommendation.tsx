
"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import dynamic from "next/dynamic";
import { MapPin, Calendar, Compass, ArrowRight, Loader2, Info, Train, Car, Route, ArrowLeftRight } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// Dynamically import Map component to avoid SSR issues with Leaflet
const RouteMap = dynamic(() => import("./route-map").then((mod) => mod.RouteMap), {
  ssr: false,
  loading: () => <div className="w-full h-[450px] bg-muted animate-pulse rounded-xl flex items-center justify-center">Loading Map...</div>,
});

const formSchema = z.object({
  fromCity: z.string().min(2, { message: "Starting city is required" }),
  toCity: z.string().min(2, { message: "Destination city is required" }),
  time: z.string().min(1, { message: "Time is required" }),
  travelMode: z.enum(["train", "road"]),
});

type FormValues = z.infer<typeof formSchema>;

interface Suggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    country?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
  };
}

const COMMON_HEADERS = {
  "User-Agent": "SunSeatGuideApp/1.0 (contact@sunseatguide.app)"
};

async function getCoordinates(placeName: string) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}`;
    const res = await fetch(url, { headers: COMMON_HEADERS });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

async function fetchRoutes(from: { lat: number; lon: number }, to: { lat: number; lon: number }) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson&alternatives=true`;
    const res = await fetch(url, { headers: COMMON_HEADERS });
    if (!res.ok) return [];
    const data = await res.json();
    return data.routes || [];
  } catch (error) {
    console.error("Routing error:", error);
    return [];
  }
}

export function SeatRecommendation() {
  const [loading, setLoading] = useState(false);
  const [recLoading, setRecLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [fromSuggestions, setFromSuggestions] = useState<Suggestion[]>([]);
  const [toSuggestions, setToSuggestions] = useState<Suggestion[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [coords, setCoords] = useState<{ from: [number, number]; to: [number, number] } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

  const fromTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fromCity: "",
      toCity: "",
      time: "",
      travelMode: "road",
    },
  });

  const watchMode = form.watch("travelMode");

  // Attempt to get user's location to bias search results
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          console.log("Geolocation bias disabled or denied", error);
        }
      );
    }
  }, []);

  const getFinalRecommendation = useCallback(async () => {
    const values = form.getValues();
    if (!coords || !values.time) return;

    setRecLoading(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_API_KEY 
      const url = `https://sun-seat-node.onrender.com/recommend-seat?fromLat=${coords.from[0]}&fromLon=${coords.from[1]}&toLat=${coords.to[0]}&toLon=${coords.to[1]}&time=${encodeURIComponent(values.time)}`;
      const res = await fetch(url, { headers: { "x-api-key": apiKey} });
      if (!res.ok) throw new Error('Recommendation API failed');
      const result = await res.json();
      setRecommendation(result.recommendation);
    } catch (error) {
      console.error("Recommendation error:", error);
      toast({
        variant: "destructive",
        title: "Recommendation Failed",
        description: "Could not calculate the recommendation. Please ensure the backend is running.",
      });
    } finally {
      setRecLoading(false);
    }
  }, [form, coords, toast]);

  useEffect(() => {
    if (coords) {
      getFinalRecommendation();
    }
  }, [watchMode, selectedRouteIndex, coords, getFinalRecommendation]);

  const fetchSuggestions = useCallback(async (query: string, setter: (val: Suggestion[]) => void) => {
    if (query.length < 3) {
      setter([]);
      return;
    }
    try {
      // Use userLocation viewbox to prioritize nearby results if available
      let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=6`;

      if (userLocation) {
        const offset = 2.0; // roughly ~200km radius for biasing
        const viewbox = `${userLocation.lon - offset},${userLocation.lat + offset},${userLocation.lon + offset},${userLocation.lat - offset}`;
        url += `&viewbox=${viewbox}&bounded=0`; // bounded=0 means prioritize but don't restrict
      }

      const res = await fetch(url, {
        headers: {
          ...COMMON_HEADERS,
          "Accept-Language": typeof navigator !== 'undefined' ? navigator.language : "en"
        }
      });
      if (res.ok) {
        const data = await res.json();
        setter(data);
      }
    } catch (error) {
      console.error("Fetch suggestions error:", error);
    }
  }, [userLocation]);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setRecommendation(null);
    setRoutes([]);
    setSelectedRouteIndex(0);
    setCoords(null);

    try {
      const fromCoords = await getCoordinates(values.fromCity);
      const toCoords = await getCoordinates(values.toCity);

      if (!fromCoords || !toCoords) {
        throw new Error("Could not resolve location coordinates.");
      }

      setCoords({ from: [fromCoords.lat, fromCoords.lon], to: [toCoords.lat, toCoords.lon] });

      const foundRoutes = await fetchRoutes(fromCoords, toCoords);
      setRoutes(foundRoutes);

      toast({
        title: "Journey Mapped",
        description: `Found ${foundRoutes.length} possible path(s).`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Calculation failed.",
      });
    } finally {
      setLoading(false);
    }
  }

  const handleSwap = () => {
    const currentFrom = form.getValues("fromCity");
    const currentTo = form.getValues("toCity");
    form.setValue("fromCity", currentTo);
    form.setValue("toCity", currentFrom);

    if (currentFrom && currentTo && coords) {
      form.handleSubmit(onSubmit)();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 px-4 py-8">
      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-2">
            <Compass className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-primary">Sun Seat Guide</CardTitle>
          <CardDescription className="text-lg">
            Plan your journey's comfort by tracking the sun's path.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="relative grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] items-center gap-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fromCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-accent" /> Departure City
                        </FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              placeholder="e.g. London"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                if (fromTimeoutRef.current) clearTimeout(fromTimeoutRef.current);
                                fromTimeoutRef.current = setTimeout(() => {
                                  fetchSuggestions(e.target.value, setFromSuggestions);
                                }, 400);
                              }}
                              onBlur={() => setTimeout(() => setFromSuggestions([]), 200)}
                            />
                          </FormControl>
                          {fromSuggestions.length > 0 && (
                            <div className="absolute z-[100] mt-1 w-full rounded-md border border-input bg-background shadow-lg overflow-hidden">
                              {fromSuggestions.map((s) => (
                                <div
                                  key={s.place_id}
                                  className="px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground text-sm transition-colors border-b last:border-b-0 flex flex-col"
                                  onClick={() => {
                                    field.onChange(s.display_name);
                                    setFromSuggestions([]);
                                  }}
                                >
                                  <span className="font-medium truncate">{s.display_name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center justify-center pt-6 md:pt-8">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors h-10 w-10 border border-input md:border-transparent"
                    onClick={handleSwap}
                  >
                    <ArrowLeftRight className="w-5 h-5 rotate-90 md:rotate-0" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="toCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-accent" /> Destination City
                        </FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              placeholder="e.g. Paris"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                if (toTimeoutRef.current) clearTimeout(toTimeoutRef.current);
                                toTimeoutRef.current = setTimeout(() => {
                                  fetchSuggestions(e.target.value, setToSuggestions);
                                }, 400);
                              }}
                              onBlur={() => setTimeout(() => setToSuggestions([]), 200)}
                            />
                          </FormControl>
                          {toSuggestions.length > 0 && (
                            <div className="absolute z-[100] mt-1 w-full rounded-md border border-input bg-background shadow-lg overflow-hidden">
                              {toSuggestions.map((s) => (
                                <div
                                  key={s.place_id}
                                  className="px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground text-sm transition-colors border-b last:border-b-0 flex flex-col"
                                  onClick={() => {
                                    field.onChange(s.display_name);
                                    setToSuggestions([]);
                                  }}
                                >
                                  <span className="font-medium truncate">{s.display_name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-dashed">
                <FormField
                  control={form.control}
                  name="travelMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Travel Mode</FormLabel>
                      <FormControl>
                        <Tabs value={field.value} onValueChange={field.onChange} className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="road" className="flex items-center gap-2">
                              <Car className="w-4 h-4" /> Road
                            </TabsTrigger>
                            <TabsTrigger value="train" className="flex items-center gap-2">
                              <Train className="w-4 h-4" /> Train
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-accent" /> Departure Time
                      </FormLabel>
                      <FormControl>
                        <Input type="datetime-local" className="w-full" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 transition-all duration-300 shadow-md"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Finding Routes...
                  </>
                ) : (
                  <>
                    Plan Journey
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {coords && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Route className="w-5 h-5 text-primary" /> Visual Path
            </h3>
            <RouteMap
              fromCoords={coords.from}
              toCoords={coords.to}
              routes={routes}
              selectedRouteIndex={selectedRouteIndex}
              onRouteSelect={setSelectedRouteIndex}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold">Route Options</h3>
            <div className="space-y-3">
              {routes.length === 0 ? (
                <div className="p-4 text-center bg-muted rounded-lg border border-dashed">
                  No detailed routes found.
                </div>
              ) : (
                routes.map((route, index) => (
                  <Card
                    key={index}
                    className={`cursor-pointer transition-all hover:shadow-md ${index === selectedRouteIndex ? 'border-primary ring-1 ring-primary' : 'border-transparent bg-muted/30'}`}
                    onClick={() => setSelectedRouteIndex(index)}
                  >
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-sm">Option {index + 1}</div>
                        <div className="text-xs text-muted-foreground">
                          {Math.round(route.distance / 1000)} km &bull; {Math.round(route.duration / 60)} mins
                        </div>
                      </div>
                      {index === selectedRouteIndex && (
                        <Badge variant="default" className="bg-primary">Active</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="pt-4 border-t">
              <div className="text-sm font-medium text-muted-foreground mb-2">Selected Mode</div>
              <Badge variant="secondary" className="text-lg py-1 px-3 flex items-center gap-2 w-fit">
                {watchMode === 'road' ? <Car className="w-4 h-4" /> : <Train className="w-4 h-4" />}
                {watchMode.charAt(0).toUpperCase() + watchMode.slice(1)}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {(recommendation || recLoading) && (
        <div className="animate-fade-in">
          <Alert className="border-primary/20 bg-primary/5 p-6 rounded-xl shadow-lg relative overflow-hidden">
            {recLoading && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            <Info className="h-6 w-6 text-primary" />
            <AlertTitle className="text-xl font-bold text-primary mb-2">Journey Recommendation</AlertTitle>
            <AlertDescription className="text-lg leading-relaxed text-foreground/90">
              {recommendation || "Calculating best seat for your route..."}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
