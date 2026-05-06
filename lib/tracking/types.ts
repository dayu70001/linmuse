export type TrackingStatus =
  | "delivered"
  | "in_transit"
  | "out_for_delivery"
  | "exception"
  | "unknown";

export type TrackingSource = "hualei" | "zxd" | "17track";

export type TrackingEvent = {
  date: string;
  location: string;
  event: string;
};

export type TrackingResult = {
  tracking_number: string;
  found: true;
  source: TrackingSource;
  carrier: string;
  status: TrackingStatus;
  destination: string;
  latest_update: TrackingEvent;
  history: TrackingEvent[];
};

export type TrackingFailure = {
  tracking_number: string;
  found: false;
  source: "hualei,zxd,17track";
  errors: {
    hualei?: string;
    zxd?: string;
    track17?: string;
  };
};

export type TrackingSourceResult =
  | TrackingResult
  | {
      tracking_number: string;
      found: false;
      source: TrackingSource;
      error: string;
    };

