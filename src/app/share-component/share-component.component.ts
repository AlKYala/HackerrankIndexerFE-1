import {Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges} from '@angular/core';
import {environment} from "../../environments/environment";
import {HttpClient} from "@angular/common/http";

@Component({
  selector: 'app-share-component',
  templateUrl: './share-component.component.html',
  styleUrls: ['./share-component.component.css']
})
export class ShareComponentComponent implements OnChanges {

  @Input()
  userDataToken: string = "";

  //QR RELATED
  qrLink       = "";
  elementType  = 'url';

  endpoint = `localhost:4200/permalink`;

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
    this.qrLink = `${this.endpoint}/${this.userDataToken}`;
  }

  copyPermalinkToClipboard() {
    navigator.clipboard.writeText(this.qrLink)
      .then(
        //TODO Toastr
      );
  }
}
