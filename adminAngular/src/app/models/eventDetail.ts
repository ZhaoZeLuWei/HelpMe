export class EventDetail {
  EventID!: number;
  EventName!: string;
  EventDate!: string;
  Description!: string;
  ImageURL!: string;
  Goal!: number;
  Status!: string;
  LocationName!: string;
  StreetAddress!: string;
  VenueDetails!: string;
  CategoryName!: string;
  OrgName!: string;
  Email!: string;
  PhoneNumber!: string;
  OrgStreetAddress!: string;
  OrgVenueDetails!: string;
  Tickets!: string;

  constructor(init?: Partial<EventDetail>) {
    Object.assign(this, init);
  }
}
