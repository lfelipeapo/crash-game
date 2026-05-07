import { Injectable } from "@nestjs/common";
import { Subject, Observable } from "rxjs";
import type { CrashGameEvent } from "@crash/contracts";

@Injectable()
export class GameEventBus {
  private readonly subject = new Subject<CrashGameEvent>();

  get events$(): Observable<CrashGameEvent> {
    return this.subject.asObservable();
  }

  emit(event: CrashGameEvent): void {
    this.subject.next(event);
  }
}
