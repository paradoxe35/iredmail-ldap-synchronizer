import send_mail from "./notifications";

export class ExceptionNotifier extends Error {
  constructor(message: string, trigger?: string) {
    super(message);
    this.name = trigger || "ExceptionNotifier";

    // Send notification warning
    send_mail({ name: this.name, message });
  }
}
