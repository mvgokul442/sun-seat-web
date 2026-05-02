
"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MapPin, Calendar, Compass, ArrowRight, Loader2, Info } from "lucide-react";
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

const formSchema = z.object({
  fromLat: z.coerce.number().min(-90).max(90, { message: "Latitude must be between -90 and 90" }),
  fromLon: z.coerce.number().min(-180).max(180, { message: "Longitude must be between -180 and 180" }),
  toLat: z.coerce.number().min(-90).max(90, { message: "Latitude must be between -90 and 90" }),
  toLon: z.coerce.number().min(-180).max(180, { message: "Longitude must be between -180 and 180" }),
  time: z.string().min(1, { message: "Time is required" }),
});

type FormValues = z.infer<typeof formSchema>;

export function SeatRecommendation() {
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fromLat: 0,
      fromLon: 0,
      toLat: 0,
      toLon: 0,
      time: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setRecommendation(null);
    try {
      // Backend integration as requested: native Fetch to http://localhost:3000/recommend-seat
      const response = await fetch("http://localhost:3000/recommend-seat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch recommendation. Ensure the backend is running.");
      }

      const data = await response.json();
      setRecommendation(data.recommendation || "No specific recommendation received.");
      
      toast({
        title: "Success",
        description: "Your recommendation is ready!",
      });
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Connection failed to the backend API.",
      });
      // Mock for demonstration if the local backend is missing
      setRecommendation("Backend at localhost:3000 was unreachable. Example result: 'Sit on the left side to avoid direct sunlight during this morning journey.'");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 px-4 py-8">
      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-2">
            <Compass className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-primary">Seat Guide</CardTitle>
          <CardDescription className="text-lg">
            Plan your journey's comfort by tracking the sun's path.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-accent font-semibold mb-2">
                    <MapPin className="w-4 h-4" />
                    <span>Departure Point</span>
                  </div>
                  <FormField
                    control={form.control}
                    name="fromLat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude</FormLabel>
                        <FormControl>
                          <Input placeholder="0.0000" type="number" step="any" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fromLon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude</FormLabel>
                        <FormControl>
                          <Input placeholder="0.0000" type="number" step="any" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-accent font-semibold mb-2">
                    <MapPin className="w-4 h-4" />
                    <span>Destination</span>
                  </div>
                  <FormField
                    control={form.control}
                    name="toLat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude</FormLabel>
                        <FormControl>
                          <Input placeholder="0.0000" type="number" step="any" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="toLon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude</FormLabel>
                        <FormControl>
                          <Input placeholder="0.0000" type="number" step="any" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-dashed">
                <div className="flex items-center gap-2 text-accent font-semibold mb-4">
                  <Calendar className="w-4 h-4" />
                  <span>Travel Time</span>
                </div>
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
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
                    Calculating...
                  </>
                ) : (
                  <>
                    Get Seat Recommendation
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {recommendation && (
        <div className="animate-fade-in">
          <Alert className="border-primary/20 bg-primary/5 p-6 rounded-xl shadow-lg">
            <Info className="h-6 w-6 text-primary" />
            <AlertTitle className="text-xl font-bold text-primary mb-2">Your Recommendation</AlertTitle>
            <AlertDescription className="text-lg leading-relaxed text-foreground/90">
              {recommendation}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
