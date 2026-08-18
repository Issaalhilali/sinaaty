// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class L10nEn extends L10n {
  L10nEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'Sinaaty';

  @override
  String get tabMyCars => 'My cars';

  @override
  String get tabRequest => 'Request';

  @override
  String get tabWallet => 'Wallet';

  @override
  String get tabAccount => 'Account';

  @override
  String get tabToday => 'Today';

  @override
  String get tabOrders => 'Orders';

  @override
  String get tabParts => 'Parts';

  @override
  String get tabRequests => 'Requests';

  @override
  String get tabMySales => 'My sales';

  @override
  String get loginTitle => 'Welcome to Sinaaty';

  @override
  String get loginSubtitle => 'Enter your mobile number and we’ll send a code';

  @override
  String get phoneLabel => 'Mobile number';

  @override
  String get phoneHint => '05xxxxxxxx';

  @override
  String get sendCode => 'Send code';

  @override
  String get otpTitle => 'Enter the code';

  @override
  String otpSubtitle(String phone) {
    return 'We sent a 6-digit code to $phone';
  }

  @override
  String get verify => 'Verify';

  @override
  String get resendCode => 'Resend';

  @override
  String get loginWithNafath => 'Sign in with Nafath';

  @override
  String get logout => 'Sign out';

  @override
  String get errorGeneric => 'Something went wrong, please try again.';

  @override
  String get errorNetwork =>
      'No internet connection. Check your network and retry.';

  @override
  String get errorInvalidPhone => 'Enter a valid Saudi mobile number.';

  @override
  String get retry => 'Retry';

  @override
  String get cancel => 'Cancel';

  @override
  String get continueLabel => 'Continue';

  @override
  String get emptyCarsTitle => 'No cars yet';

  @override
  String get emptyCarsBody => 'Add your car by VIN or plate to get started.';

  @override
  String get addCar => 'Add a car';

  @override
  String get welcomeBack => 'Welcome back';

  @override
  String get todayEmpty => 'No orders today — create your first repair order.';

  @override
  String get newWorkOrder => 'New work order';

  @override
  String get comingSoon => 'Coming soon';
}
