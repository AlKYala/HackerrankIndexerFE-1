import {Injectable} from "@angular/core";
import {environment} from "../../environments/environment";
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";
import {Planguage} from "../datamodels/PLanguage/model/PLanguage";
import {PassPercentages} from "../datamodels/Analytics/models/PassPercentages";
import {ServiceHandler} from "./ServiceHandler/ServiceHandler";
import {RequestServiceEnum} from "./ServiceHandler/RequestServiceEnum";
import {RequestService} from "./ServiceHandler/RequestService";
import {GeneralPercentage} from "../datamodels/Analytics/models/GeneralPercentage";

//TODO bei bedarf die endpunkte anpassen!!!

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {

  private path: string = `${environment.api}/analytics`

  constructor(private httpClient: HttpClient,
              private requestService: RequestService) {
  }

  public fireClearStatistics() : Observable<any> {
    //return this.httpClient.post(`${this.path}/clear`, null) as Observable<any>;
    return this.requestService.anyRequest(RequestServiceEnum.POST, `${this.path}/clear`, null);
  }

  public getPercentagePassedSubmissions(): Observable<number> {
    //return this.httpClient.get(`${this.path}/submissions/passed`) as Observable<number>;
    return this.requestService
      .anyRequest(RequestServiceEnum.GET, `${this.path}/submissions/passed`) as Observable<number>;
  }

  public getPercentagePassedChallenges(): Observable<number> {
    //return this.httpClient.get(`${this.path}/challenges/passed`) as Observable<number>;
    return this.requestService
      .anyRequest(RequestServiceEnum.GET, `${this.path}/challenges/passed`) as Observable<number>;
  }

  public getPercentageOfPassedByLanguageId(languageId: number): Observable<number> {
    //return this.httpClient.get(`${this.path}/pLanguage/${languageId}/passed`) as Observable<number>;
    return this.requestService
      .anyRequest(RequestServiceEnum.GET, `${this.path}/pLanguage/${languageId}/passed`) as Observable<number>;
  }

  public getPassPercentagesOfPLanguages(): Observable<PassPercentages> {
    //return this.httpClient.get(`${this.path}/pLanguage/percentages/passed`) as Observable<PassPercentages>;
    return this.requestService
      .anyRequest(RequestServiceEnum.GET, `${this.path}/pLanguage/percentages/passed`) as Observable<any>;
  }

  public getFavouritePLanguage(): Observable<Planguage> {
    //return this.httpClient.get(`${this.path}/pLanguage/favourite`) as Observable<Planguage>;
    return this.requestService
      .anyRequest(RequestServiceEnum.GET, `${this.path}/pLanguage/favourite`) as Observable<Planguage>;
  }

  /*public checkUploadsExist(): Observable<boolean> {
    //return this.httpClient.get(`${this.path}/exists`) as Observable<boolean>;
    return this.requestService
      .anyRequest(RequestServiceEnum.GET, `${this.path}/exists`) as Observable<boolean>;
  }*/

  public getNumberOfUsers(): Observable<number> {
    return this.requestService
      .anyRequest(RequestServiceEnum.GET, `${this.path}/numberUsers`) as Observable<number>;
  }

  public getNumberOfSubmissions(): Observable<number> {
    return this.requestService
      .anyRequest(RequestServiceEnum.GET, `${this.path}/numberSubmissions`) as Observable<number>;
  }

  public getGeneralPercentages(): Observable<GeneralPercentage> {
    return this.requestService
      .anyRequest(RequestServiceEnum.GET, `${this.path}/general`) as Observable<GeneralPercentage>;
  }
}
