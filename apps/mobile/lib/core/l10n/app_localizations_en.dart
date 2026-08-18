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

  @override
  String get activeOrders => 'Current repair orders';

  @override
  String get noActiveOrders => 'No repair orders right now';

  @override
  String get myCars => 'My cars';

  @override
  String get vinLabel => 'VIN';

  @override
  String get plateLabel => 'Plate number';

  @override
  String get addCarTitle => 'Add your car';

  @override
  String get addCarSubtitle =>
      'Enter the 17-character VIN or the plate — we identify the car automatically.';

  @override
  String get addCarSubmit => 'Add car';

  @override
  String get addCarNeedOne => 'Enter a VIN or a plate number.';

  @override
  String get carPassport => 'Car passport';

  @override
  String get noPassportEvents =>
      'Everything that happens to your car will show here: service, parts, inspections.';

  @override
  String get odometer => 'Odometer';

  @override
  String get km => 'km';

  @override
  String get shareCarPassport => 'Share car passport';

  @override
  String get workOrder => 'Repair order';

  @override
  String workOrderNumber(String number) {
    return 'Repair order $number';
  }

  @override
  String get timeline => 'Progress';

  @override
  String get photos => 'Photos';

  @override
  String photosCount(int count) {
    return '$count photos';
  }

  @override
  String get items => 'Items';

  @override
  String get total => 'Total';

  @override
  String get vat => 'VAT 15%';

  @override
  String get subtotal => 'Subtotal';

  @override
  String get approveNow => 'Review & approve';

  @override
  String get approveTitle => 'Approve repair order';

  @override
  String get approveHint =>
      'Your signature locks this price — any change reaches you as a new version.';

  @override
  String get approveWithNafath => 'Approve with Nafath';

  @override
  String get approveWithOtp => 'Approve with SMS code';

  @override
  String get nafathPickNumber => 'Open the Nafath app and pick the number';

  @override
  String get nafathWaiting => 'Waiting for your approval in Nafath…';

  @override
  String get approved => 'Approved — the workshop starts now';

  @override
  String get declineOrder => 'Decline';

  @override
  String get declineReason => 'Reason';

  @override
  String versionN(int n) {
    return 'Version $n';
  }

  @override
  String changeReason(String reason) {
    return 'Change reason: $reason';
  }

  @override
  String get confirmReceipt => 'I received my car';

  @override
  String get confirmReceiptHint =>
      'Confirming releases the held amount to the workshop.';

  @override
  String get payNow => 'Pay now';

  @override
  String get payInvoice => 'Pay invoice';

  @override
  String get invoice => 'Invoice';

  @override
  String invoiceNumber(String number) {
    return 'Invoice $number';
  }

  @override
  String get paid => 'Paid';

  @override
  String get due => 'Due';

  @override
  String dueOn(String date) {
    return 'Due $date';
  }

  @override
  String get amountHeld => 'Amount is held until you receive your car';

  @override
  String get payWithMada => 'mada';

  @override
  String get payWithApplePay => 'Apple Pay';

  @override
  String get paymentDone => 'Paid — thank you';

  @override
  String get paymentFailed => 'Payment did not complete, try again.';

  @override
  String get paySheetTitle => 'Choose payment method';

  @override
  String get invoices => 'Invoices';

  @override
  String get notes => 'Promissory notes';

  @override
  String get note => 'Promissory note';

  @override
  String noteNumber(String number) {
    return 'Note $number';
  }

  @override
  String get outstanding => 'Outstanding';

  @override
  String get noteClosedHint => 'Note closed and clearance issued';

  @override
  String get settlement => 'Clearance';

  @override
  String get overdue => 'Overdue';

  @override
  String get noteHint =>
      'Electronic note via Nafez — closes automatically when you pay.';

  @override
  String get walletEmptyTitle => 'No invoices or notes';

  @override
  String get walletEmptyBody =>
      'Your invoices, payments, notes and clearances will show here.';

  @override
  String get notifications => 'Notifications';

  @override
  String get notificationsEmpty => 'No notifications yet';

  @override
  String get markAllRead => 'Mark all read';

  @override
  String get language => 'Language';

  @override
  String get arabic => 'العربية';

  @override
  String get english => 'English';

  @override
  String get phone => 'Phone';

  @override
  String get nafathVerifiedLabel => 'Nafath verified';

  @override
  String get notVerified => 'Not verified';

  @override
  String get requestSoonTitle => 'Request a service or part';

  @override
  String get requestSoonBody =>
      'Coming soon: request an inspection, a part via reverse auction, or a tow — from here.';

  @override
  String get viewDocument => 'View document';

  @override
  String get viewInvoice => 'View invoice';

  @override
  String get statusDraft => 'Draft';

  @override
  String get statusReceived => 'Received';

  @override
  String get statusInspecting => 'Inspecting';

  @override
  String get statusAwaitingApproval => 'Awaiting your approval';

  @override
  String get statusApproved => 'Approved';

  @override
  String get statusAwaitingParts => 'Awaiting parts';

  @override
  String get statusInProgress => 'In progress';

  @override
  String get statusQualityCheck => 'Quality check';

  @override
  String get statusReady => 'Ready for pickup';

  @override
  String get statusDelivered => 'Delivered';

  @override
  String get statusClosed => 'Closed';

  @override
  String get statusCancelled => 'Cancelled';

  @override
  String get statusDisputed => 'Disputed';

  @override
  String get statusAbandoned => 'Abandoned';

  @override
  String get invStatusIssued => 'Due';

  @override
  String get invStatusPaid => 'Paid';

  @override
  String get invStatusPartiallyPaid => 'Partially paid';

  @override
  String get invStatusVoid => 'Void';

  @override
  String get invStatusOverdue => 'Overdue';

  @override
  String get invStatusRefunded => 'Refunded';

  @override
  String get noteStatusIssued => 'Active';

  @override
  String get noteStatusPartiallySettled => 'Partially settled';

  @override
  String get noteStatusClosed => 'Closed';

  @override
  String get noteStatusInEnforcement => 'In enforcement';

  @override
  String get noteStatusCancelled => 'Cancelled';

  @override
  String get noteStatusPending => 'Pending issue';

  @override
  String get signedByNafath => 'Signed with Nafath';

  @override
  String get signedByOtp => 'Signed with SMS code';

  @override
  String get securedByNote => 'Secured by note';

  @override
  String get termsPrepaid => 'Prepaid';

  @override
  String get termsOnDelivery => 'Pay on delivery';

  @override
  String get termsDeferred => 'Deferred';

  @override
  String get termsInstallments => 'Installments';

  @override
  String get termsFleetMonthly => 'Monthly statement';

  @override
  String get loading => 'Loading…';

  @override
  String get somethingWrong => 'Could not load';

  @override
  String get noOrdersForCar => 'No repair orders for this car';

  @override
  String get checkIn => 'Check-in inspection';

  @override
  String get checkOut => 'Check-out inspection';

  @override
  String damages(int count) {
    return '$count notes';
  }

  @override
  String get codeLabel => 'Verification code';

  @override
  String get invalidCode => 'Enter the 6-digit code';

  @override
  String payAmount(String amount) {
    return 'Pay $amount';
  }

  @override
  String warrantyDays(int days) {
    return '$days-day warranty';
  }

  @override
  String get nafathNumber => 'Nafath number';

  @override
  String get approveDone => 'Done';

  @override
  String get payHint =>
      'Secure payment — the amount stays held until you receive your car.';

  @override
  String clearanceIssued(String number) {
    return 'Clearance $number issued';
  }

  @override
  String get confirmApproval => 'Confirm approval';

  @override
  String get wsToday => 'Today';

  @override
  String get wsInShop => 'cars in the shop';

  @override
  String get wsAwaitingCustomer => 'awaiting customer approval';

  @override
  String get wsReadyToPayout => 'SAR ready to pay out';

  @override
  String get wsNeedsAction => 'Needs your action now';

  @override
  String get wsTodayCars => 'Today\'s cars';

  @override
  String get wsAll => 'View all';

  @override
  String get wsNewOrder => 'New order';

  @override
  String get wsNoOrders => 'No orders yet';

  @override
  String get wsNoOrdersBody =>
      'Create the first repair order: scan the plate or enter the VIN, add items, send to the customer.';

  @override
  String get wsStart => 'Start work';

  @override
  String get wsReceive => 'Receive car';

  @override
  String get wsInspect => 'Check-in inspection';

  @override
  String get wsRequestApproval => 'Send to customer for approval';

  @override
  String get wsQuality => 'To quality check';

  @override
  String get wsReady => 'Ready for pickup';

  @override
  String get wsDeliver => 'Delivered';

  @override
  String get wsIssueInvoice => 'Issue invoice';

  @override
  String get wsAddPhoto => 'Add photo';

  @override
  String get wsWaitingCustomer =>
      'Waiting for customer approval — work starts after they approve';

  @override
  String get wsCustomerPhone => 'Customer phone';

  @override
  String get wsTitle => 'Short description';

  @override
  String get wsTitleHint => 'e.g. front fender bodywork';

  @override
  String get wsItems => 'Items';

  @override
  String get wsAddItem => 'Add item';

  @override
  String get wsItemDesc => 'Description';

  @override
  String get wsItemPrice => 'Price';

  @override
  String get wsItemQty => 'Qty';

  @override
  String get wsLabor => 'Labor';

  @override
  String get wsPart => 'Part';

  @override
  String get wsWarranty => 'Warranty (days)';

  @override
  String get wsPaymentTerms => 'Payment terms';

  @override
  String get wsCreate => 'Create order';

  @override
  String get wsEstimate => 'Estimate';

  @override
  String get wsAngles => '8 angles';

  @override
  String wsAngleOf(int done, int total) {
    return '$done / $total';
  }

  @override
  String get wsShootNext => 'Shoot next angle';

  @override
  String get wsSubmitInspection => 'Save check-in';

  @override
  String get wsDamages => 'Body notes';

  @override
  String get wsAddDamage => 'Add note';

  @override
  String get wsFuel => 'Fuel %';

  @override
  String get wsZone => 'Zone';

  @override
  String get wsSeverity => 'Severity';

  @override
  String get wsMinor => 'Minor';

  @override
  String get wsModerate => 'Moderate';

  @override
  String get wsSevere => 'Severe';

  @override
  String get wsOffline => 'Offline — will send automatically when back online';

  @override
  String wsPendingSync(int count) {
    return '$count actions pending sync';
  }

  @override
  String get wsSynced => 'Synced';

  @override
  String get wsWalletHeld => 'Held until customers confirm';

  @override
  String get wsWalletAvailable => 'Available to pay out';

  @override
  String get wsWalletTransit => 'On its way to the bank';

  @override
  String get wsPayouts => 'Payouts';

  @override
  String get wsNoPayouts =>
      'No payouts yet — scheduled automatically when balance is available.';

  @override
  String get wsPartsSoon => 'Parts for this car';

  @override
  String get wsPartsSoonBody =>
      'Coming soon: search by VIN, buy from distributors on a secured trade account, or open a scrapyard auction.';

  @override
  String get wsOrders => 'Orders';

  @override
  String get wsActive => 'Active';

  @override
  String get wsDone => 'Done';

  @override
  String get wsAngleFront => 'Front';

  @override
  String get wsAngleFrontRight => 'Front right';

  @override
  String get wsAngleRight => 'Right';

  @override
  String get wsAngleRearRight => 'Rear right';

  @override
  String get wsAngleRear => 'Rear';

  @override
  String get wsAngleRearLeft => 'Rear left';

  @override
  String get wsAngleLeft => 'Left';

  @override
  String get wsAngleFrontLeft => 'Front left';

  @override
  String get wsCustomer => 'Customer';

  @override
  String get wsPhotoAdded => 'Photo added';

  @override
  String wsInvoiceIssued(String number) {
    return 'Invoice $number issued';
  }

  @override
  String get wsCustomerApprovedHint =>
      'Customer approved — start work and upload the first photo.';
}
