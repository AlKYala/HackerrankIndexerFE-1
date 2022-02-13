import {User} from "../../User/model/User";
import {Planguage} from "../../PLanguage/model/PLanguage";

export interface GeneralPercentage {
  user: User;
  percentageChallengesSolved: number;
  percentageSubmissionPassed: number;
  favouriteLanguage: Planguage;
}
