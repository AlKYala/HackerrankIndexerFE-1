import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  HostListener,
  ChangeDetectorRef
} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {async, BehaviorSubject, Observable, Subscription} from "rxjs";
import {Submission} from "../../shared/datamodels/Submission/model/Submission";
import {SubmissionService} from "../../shared/datamodels/Submission/service/SubmissionService";
import {ActivatedRoute, Router} from "@angular/router";
import {PLanguageService} from "../../shared/datamodels/PLanguage/service/PLanguageService";
import {ChallengeService} from "../../shared/datamodels/Challenge/service/ChallengeService";
import {faCoffee} from '@fortawesome/free-solid-svg-icons';
import {SubmissionDataService} from "../../shared/services/SubmissionDataService";
import {ServiceHandler} from "../../shared/services/ServiceHandler/ServiceHandler";
import {RequestServiceEnum} from "../../shared/services/ServiceHandler/RequestServiceEnum";
import {environment} from "../../environments/environment";
import {RequestService} from "../../shared/services/ServiceHandler/RequestService";
import {JwPaginationComponent} from "jw-angular-pagination";
import paginate from "jw-paginate";
import {Planguage} from "../../shared/datamodels/PLanguage/model/PLanguage";
import {FormControl} from "@angular/forms";
import {HashMap} from "../../shared/other/HashMap";
import {FilterRequest} from "../../shared/datamodels/Submission/model/FilterRequest";
import {SubmissionDownloadService} from "../../shared/services/SubmissionDownloadService";
import {DownloadFile} from "../../shared/datamodels/DownloadFile/Model/DownloadFile";
import {NgxBootstrapConfirmService} from "ngx-bootstrap-confirm";
import {LogInOutService} from "../../shared/services/LogInOutService";
import {start} from "repl";

@Component({
  selector: 'app-submission-list',
  templateUrl: './submission-list.component.html',
  styleUrls: ['./submission-list.component.scss']
})
export class SubmissionListComponent implements OnChanges, OnDestroy, OnInit {

  @Input()
  submissions: Submission[] = [];

  @Input()
  languages: Planguage[] = [];

  @Input()
  challengeNames: string[] = [];
  challengeNamesDisplay: string[] = [];

  private mainSubscription: Subscription = new Subscription();

  submissionsBackup: Submission[] = [];

  @Input()
  inputChallengeId: number | undefined;
  @Input()
  inputLanguageid: number | undefined;

  @Input()
  isOnAnalyticsPage: boolean | undefined;


  filteredByInput: boolean = false;

  private challengeId: number = -1;
  private pLanguageId: number = -1;
  faCoffee = faCoffee;

  public enabledLanguages!: boolean[];
  private selectedLanguages: Set<number>;

  onlyPassedSubmissions: boolean = false;
  onlyFailedSubmissions: boolean = false;
  onlyLastPassedSubmissions: boolean = false;

  searchFormControl = new FormControl();


  /**
   * PAGINATION VARIABLES
   */

  /**
   * Defines the "current" Page in the Paginator
   */
  currentPage: BehaviorSubject<number> = new BehaviorSubject<number>(1);

  /**
   * Defines how many Pages the paginator displays
   */
  numberOfElementsPerPage: BehaviorSubject<number> = new BehaviorSubject<number>(5);

  /**
   * Event listener for when the current page changes
   */
  pageSubscriber!: Subscription;

  /**
   * Event listener for when the
   */
  numberOfElementsPerPageSubscriber!: Subscription;

  /**
   * Defines how many Items are shown in the Submission list
   */
  numberSubmissionsPerPage = 10;

  /**
   * Variable for the last page of the paginator.
   * 20 is a placeholder value.
   */
  lastPage = 20;

  /**
   * The submissions listed
   */
  paginationSubmissions: Submission[] = [];

  /**
   * Display current Page in Fronten
   */
  currentPageFrontEnd = this.currentPage.value;

  /**
   * Defines if the next page / second next page is shown
   */
  showNextPage: boolean = true;
  showNextNextPage: boolean = true;

  showLastPage: boolean = false;
  showDots: boolean = false;

  /**
   * Defines if the next page / second next page is shown
   */
  showPreviousPage: boolean = false;
  showPreviousPreviousPage: boolean = false;
  showFirstPage: boolean = false;


  /**
   * PAGINATION VARIABLES END
   */

  render: boolean = true;

  constructor(private httpClient: HttpClient,
              private submissionService: SubmissionService,
              private submissionDataService: SubmissionDataService,
              private route: ActivatedRoute,
              private pLanguageService: PLanguageService,
              private challengeService: ChallengeService,
              private router: Router,
              private logInOutService: LogInOutService,
              private requestService: RequestService,
              private submissionDownloadService: SubmissionDownloadService,
              private changeDetectorRef: ChangeDetectorRef) {
    this.selectedLanguages = new Set<number>();
  }

  ngOnInit() {
    //TODO init paginator
    this.pageSubscriber = this.currentPage.subscribe((newPage: number) => {
      this.setSubmissionPage();
      this.currentPageFrontEnd = newPage;
      this.recalculatePagination(newPage);
    });

    this.numberOfElementsPerPageSubscriber = this.numberOfElementsPerPage.subscribe((numberElementsOnPage: number) => {
      this.numberSubmissionsPerPage = numberElementsOnPage;
      this.setPage(1);
    });

    this.setSubscribers();
  }


  //Setting event listeners
  private setSubscribers() {
    this.mainSubscription.add(this.pageSubscriber);
    this.mainSubscription.add(this.numberOfElementsPerPageSubscriber);
  }

  ngOnChanges(changes: SimpleChanges) {
    this.submissionsBackup = this.submissions;
    this.enableLanguages(this.languages.length); //langaugeSize

    //
  }

  ngOnDestroy(): void {
    this.mainSubscription.unsubscribe();
  }


  /**
   * FILTERING BEGIN
   */

  /**
   * FIred when:
   * Searchbox changes
   * language is clicked
   * after state change (see filter by state)
   * @private
   */
  public fireEnitreFilter() {
    this.submissions = this.submissionsBackup;
    //SEARCHBOX - THIS HAS TO BE FIRST
    this.filterByChallengeName();
    //CHECKBOX STATE
    this.filterByState();
    //LANGUAGES
    this.filterBySelectedLanguages();
    this.setPage(1);
  }

  public navigateToListingDetail(submission: Submission): void {
    this.submissionDataService.setSubmission(submission);
    this.router.navigate([`/submission/${submission.id}`]);
  }

  /** FILTERING SEARCH SUGGESTIONS */

  /**
   * FILTERING BY NAME
   */
  public filterByChallengeName() {
    const search = this.searchFormControl.value;
    console.log(search);
    if (search == null || search.length == 1) {
      this.submissions = this.submissionsBackup; // REASON WHY HAS TO BE FIRST
      return;
    }
    console.log("searching");
    this.submissions = this.submissions
      .filter(submission => submission.challenge.challengeName.toLowerCase().includes(search.toLowerCase()));
    this.setPage(1);
  }

  public toggleSuggestions() {
    let searchValue = this.searchFormControl.value;
    if(searchValue == null || searchValue.length < 3) {
      this.challengeNamesDisplay = [];
      return;
    }
    searchValue = searchValue.toLowerCase();
    this.challengeNamesDisplay = this.challengeNames.filter((challengename) => challengename.toLowerCase().includes(searchValue));
  }

  public clickSearchResult(value: string) {
    console.log("click");
    this.searchFormControl.setValue(value);
    this.challengeNamesDisplay = [];
    this.filterByChallengeName();
  }

  /**
   * FILTERING BY NAME END
   */

  /**
   * FILTERING BY LANGUAGE BEGIN
   */

  private filterBySelectedLanguages() {
    if (this.selectedLanguages.size == 0) {
      return;
    }
    this.submissions = this.submissions
      .filter((submission: Submission) => this.selectedLanguages.has(submission.language.id!));
  }

  public clickLanguage(pLanguage: Planguage): void {

    const id: number = pLanguage.id!;
    if (this.selectedLanguages.has(id)) {
      this.selectedLanguages.delete(id);
    } else {
      this.selectedLanguages.add(id);
    }
    this.fireEnitreFilter();
  }

  /**
   * FILTERING BY LANGAUGES END
   */

  /**
   * FILTERING BY STATE BEGIN
   */

  private filterByState() {
    if (this.onlyPassedSubmissions) {
      this.filterForPassedSubmissions();
      return;
    }

    if (this.onlyFailedSubmissions) {
      this.filterForFailedSubmissions();
      return;
    }

    if (this.onlyLastPassedSubmissions) {
      this.filterForMostRecentPassedSubmissions();
    }
  }

  public checkOnlyPassedSubmissions() {


    if (this.onlyPassedSubmissions) {
      this.onlyPassedSubmissions = false;
      this.fireEnitreFilter();
      return;
    }

    this.onlyFailedSubmissions = false;
    this.onlyLastPassedSubmissions = false;
    this.onlyPassedSubmissions = true;

    this.fireEnitreFilter();
  }

  public checkOnlyFailedSubmissions() {

    if (this.onlyFailedSubmissions) {
      this.onlyFailedSubmissions = false;
      this.fireEnitreFilter();
      return;
    }
    this.onlyFailedSubmissions = true;
    this.onlyLastPassedSubmissions = false;
    this.onlyPassedSubmissions = false;

    this.fireEnitreFilter();
  }

  public checkOnlyLastPassedSubmissions() {
    if (this.onlyLastPassedSubmissions) {
      this.onlyLastPassedSubmissions = false;
      this.fireEnitreFilter();
      return;
    }
    this.onlyFailedSubmissions = false;
    this.onlyLastPassedSubmissions = true;
    this.onlyPassedSubmissions = false;

    this.fireEnitreFilter();
  }

  private filterForPassedSubmissions(): void {
    this.submissions = this.submissions
      .filter((submission: Submission) => submission.score == 1);
  }

  private filterForFailedSubmissions(): void {
    this.submissions = this.submissions
      .filter((submission: Submission) => submission.score < 1);
  }

  private filterForMostRecentPassedSubmissions(): void {
    this.filterForPassedSubmissions();

    const mostRecent = {};
    for (const submission of this.submissions) {
      const id: number = submission.id!;
      // @ts-ignore
      mostRecent[submission.challenge.id] = submission;
    }

    const filteredSubmissions: Submission[] = [];

    for (const key of Object.keys(mostRecent)) {
      // @ts-ignore
      filteredSubmissions.push(mostRecent[key]);
    }

    this.submissions = filteredSubmissions;

  }

  /**
   * FILTERING BY STATE END
   */

  /**
   * RESTORE FILTER BEGIN
   */

  public restoreSubmissions() {
    this.resetSearchBox();
    this.resetButtonClicks();
    this.submissions = this.submissionsBackup;
  }

  private resetButtonClicks() {
    this.resetLangaugeClicks();
    this.resetModeButtonClicks();
  }

  private resetModeButtonClicks() {
    this.onlyLastPassedSubmissions = false;
    this.onlyFailedSubmissions = false;
    this.onlyPassedSubmissions = false;
  }

  private resetLangaugeClicks() {
    this.selectedLanguages = new Set<number>();
    const languageCheckBoxes: HTMLCollection = document.getElementsByClassName("languageCheckBox");

    for (let i = 0; i < languageCheckBoxes.length; i++) {
      var temp = <HTMLInputElement>languageCheckBoxes.item(i);
      temp.checked = false;
    }
  }

  private resetSearchBox() {
    this.searchFormControl.setValue("");
  }

  /**
   * RESTORE END
   */

  /**
   * DOWNLOAD BEGIN
   */

  public fireDownload(): void {
    const numbers: number[] = this.getSubmissionIDs();
    this.submissionDownloadService.getDownloadFilesBySubmissionIds(numbers);
  }

  /**
   * DOWNLOAD END
   */

  /**
   * Returns true if filter fires
   * @private
   */
  private scanForInputParameters(): boolean {
    if (this.inputChallengeId != null && this.inputChallengeId > -1) {
      this.getSubmissionsByChallengeId(this.inputChallengeId);
      this.filteredByInput = true;
      return true;
    }
    if (this.inputLanguageid != null && this.inputLanguageid > -1) {
      this.filteredByInput = true;
      this.getSubmissionsByPLanguageId(this.inputLanguageid);
      return true;
    }
    return false;
  }

  /**
   * RELATED BEGIN
   */

  /**
   * Returns true if filter fires
   * @private
   */
  private scanForRoutingParameters(): boolean {
    //TODO need?
    const challengeIdString = this.route.snapshot.paramMap.get('challengeId');
    const pLanguageIdString = this.route.snapshot.paramMap.get('pLanguageId');

    if (typeof challengeIdString == 'string') {
      const challengeId: number = parseInt(challengeIdString);
      this.getSubmissionsByChallengeId(challengeId);
      return true;
    } else if (typeof pLanguageIdString == 'string') {
      const pLanguageId: number = parseInt(pLanguageIdString);
      this.getSubmissionsByPLanguageId(pLanguageId);
      return true;
    }
    return false;
  }

  private getSubmissionsByChallengeId(challengeId: number) {
    this.submissions.filter((submission: Submission) => {
      submission.challenge.id == challengeId
    });
  }

  private getSubmissionsByPLanguageId(pLanguageId: number) {
    this.submissions.filter((submission: Submission) => {
      submission.language.id == pLanguageId
    });
  }

  /**
   * RELATED END
   */

  /*
  PAGINATION START
   */

  /**
   * The method that fires when pages are changed
   * It finds the next n (n := set number of submissions per page) submissions to display
   * n can be smaller if you are on the last page
   * @private
   */
  private setSubmissionPage(): void {
    const startIndex: number = (this.currentPage.value - 1) * this.numberSubmissionsPerPage;
    const newPageOfSubmissions: Submission[] = [];

    this.paginationSubmissions = [];

    let end = startIndex + this.numberSubmissionsPerPage;

    end = (end > this.submissions.length) ? this.submissions.length : end;

    for (let i = startIndex; i < end; i++) {
      this.paginationSubmissions.push(this.submissions[i]);
    }
  }

  /**
   * Fired when a filter is fired:
   * Recalculates the last page and decides if the next pages are shown
   */
  private recalculatePagination(currentPage: number) {

    this.lastPage = Math.floor(this.submissions.length / this.numberSubmissionsPerPage);
    const lastPageHasRemainder: boolean = (this.submissions.length % this.numberSubmissionsPerPage) != 0;

    this.lastPage = (lastPageHasRemainder) ? this.lastPage+1 : this.lastPage;

    this.showNextPage = (this.lastPage > currentPage);
    this.showNextNextPage = (this.lastPage - currentPage) > 2 && window.innerWidth > 520;

    this.showPreviousPage = currentPage > 1;
    this.showPreviousPreviousPage = currentPage > 2 && window.innerWidth > 520;

    this.showDots = (this.lastPage - currentPage) > 3;
    this.showLastPage = this.showNextNextPage;

    this.showFirstPage = currentPage > 3;
  }

  public setPage(page: number) {
    this.currentPage.next(page);
  }

  public increase(): void {
    this.currentPage.next(this.currentPage.value - 1);
  }

  public decrease(): void {
    if (this.currentPage.value == 1) {
      return;
    }
    this.currentPage.next(this.currentPage.value - 1);
  }

  public jumpToLastPage() {
    this.currentPage.next(this.lastPage);
  }

  public jumpToFirstPage() {
    this.currentPage.next(1);
  }

  /** PAGINATION RANGE **/

  public setNumberOfSubmissionsPerPage(numberOfElementsPerPage: number) {
    this.numberOfElementsPerPage.next(numberOfElementsPerPage);
  }

  public showPagePopup() {

  }

  /**
   * Resize detector used to make Pagination smaller
   * @param event
   * @private
   */
  @HostListener("window:resize", ['$event'])
  private onResize(event: { target: { innerWidth: any; }; }) {
    const width = event.target.innerWidth;
    //510 ist kritischer wert
    if(width <= 520) {
      this.showNextNextPage = false;
      this.showPreviousPreviousPage = false;
      return;
    }
    this.showNextNextPage = this.lastPage > this.currentPage.value;
    this.showPreviousPreviousPage = this.currentPage.value > 2;
  }

  /*
  PAGINATION END
   */

  /**
   * SORTING START
   */

  //TODO idea: sort submissions with it

  /**
   * SORTING END
   */

  /*
  OTHER
   */
  private enableLanguages(size: number): void {
    console.log(this.languages);
    this.enabledLanguages = new Array<boolean>(size);
    if (this.inputLanguageid == -1) {
      this.enabledLanguages.fill(true, 0, size);
      return;
    }
    this.enabledLanguages.fill(false, 0, size);
    for (let i = 0; i < size; i++) {
      if (this.languages[i].id == this.inputLanguageid) {
        this.enabledLanguages[i] = true;
        return;
      }
    }
  }

  private getSubmissionIDs(): number[] {
    const numbers: number[] = [];
    for (let submission of this.submissions) {
      numbers.push(submission.id!);
    }
    return numbers;
  }

  /* TODO auslagenr in parent
  @HostListener("window:resize", ['$event'])
  private onResize(event: { target: { innerWidth: any; }; }) {
    const width = event.target.innerWidth;
    this.setNumberOfPagesInPaginator(width);
  }*/
}
