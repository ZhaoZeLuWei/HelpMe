export class Ticket {
  RegID!: number;
  RegName!: string;
  Email!: string;
  PhoneNumber!: string;
  RegDate!: string;
  RegQuantity!: number;
  EventName!: string;
  TicketName!: string;
  Price!: number;

  constructor(init?: Partial<Ticket>) {
    Object.assign(this, init);
  }
}
