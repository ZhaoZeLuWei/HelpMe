//create object for each event information on home page (event component)
export class HomeEvent {
  EventID: number;
  EventName: string;
  EventDate: string;
  LocationName: string;
  CategoryName: string;
  OrgName: string;
  ImageURL: string;

  constructor(EventID:number, EventName:string,EventDate: string, LocationName:string, CategoryName:string, OrgName:string, ImageURL:string) {
    this.EventID = EventID;
    this.EventName = EventName;
    this.EventDate = EventDate;
    this.LocationName = LocationName;
    this.CategoryName = CategoryName;
    this.OrgName = OrgName;
    this.ImageURL = ImageURL;
  }
}
