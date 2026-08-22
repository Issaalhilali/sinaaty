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
  String get notificationsEmptyBody =>
      'Updates about your cars, invoices and warranties land here first.';

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
  String get approveNotPending =>
      'Nothing here needs your approval right now — the current status is shown above.';

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
  String get wsNoDamages =>
      'No body notes yet — record any scratch or dent before work starts; it protects you and the customer.';

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
  String get wsPartsSearchHint =>
      'Enter the VIN above to see live-priced parts for this car.';

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

  @override
  String get ptParts => 'Parts';

  @override
  String get ptSearchByVin => 'Search by VIN';

  @override
  String get ptVinHint => '17 characters';

  @override
  String get ptOffers => 'Offers matching this car';

  @override
  String get ptNoOffers =>
      'No matching parts right now — open an auction to get offers from nearby scrapyards and shops.';

  @override
  String get ptOpenAuction => 'Request via reverse auction';

  @override
  String get ptBuyNow => 'Buy now';

  @override
  String get ptTradePrice => 'Trade price';

  @override
  String get ptRetailPrice => 'Retail';

  @override
  String get ptGenuineQr => 'Genuine QR';

  @override
  String ptLeadHours(int h) {
    return 'Arrives in $h h';
  }

  @override
  String get ptCondOem => 'OEM new';

  @override
  String get ptCondAftermarket => 'Aftermarket';

  @override
  String get ptCondUsed => 'Used (scrapyard)';

  @override
  String get ptCondRefurb => 'Refurbished';

  @override
  String get ptQty => 'Qty';

  @override
  String get ptTermsPrepaid => 'Pay now — held until you receive it';

  @override
  String get ptTermsDeferred =>
      'Deferred on secured trade account — promissory note issued';

  @override
  String get ptOrderPlaced => 'Order placed';

  @override
  String get ptMyRequests => 'My auctions';

  @override
  String get ptMyOrders => 'Part orders';

  @override
  String get ptPartName => 'Part name';

  @override
  String get ptPartNameHint => 'e.g. front brake discs';

  @override
  String get ptAcceptedConditions => 'Accepted conditions';

  @override
  String get ptBiddingMinutes => 'Auction length (min)';

  @override
  String get ptSend => 'Send request';

  @override
  String get ptBids => 'Bids';

  @override
  String ptBidsCount(int n) {
    return '$n bids';
  }

  @override
  String get ptLowest => 'Lowest';

  @override
  String ptEndsIn(int m) {
    return 'Ends in $m min';
  }

  @override
  String get ptEnded => 'Ended';

  @override
  String get ptAcceptBid => 'Accept this bid';

  @override
  String get ptAccepted => 'Accepted — purchase order created';

  @override
  String get ptNoBidsYet =>
      'No bids yet — nearby suppliers are being notified.';

  @override
  String get ptTradeAccount => 'Secured trade account';

  @override
  String get ptTradeAvailable => 'Available';

  @override
  String get ptTradeOutstanding => 'Outstanding';

  @override
  String get ptTradeLimit => 'Limit';

  @override
  String get ptRequestTrade => 'Request a trade account';

  @override
  String get ptTradePending => 'Awaiting supplier approval';

  @override
  String get ptScanQr => 'Scan part QR';

  @override
  String get ptScanHint =>
      'Point the camera at the QR label on the genuine part';

  @override
  String get ptVerifyGenuine => 'Genuine, verified part';

  @override
  String get ptVerifyFake => 'Not verified';

  @override
  String get ptVerifyAlert => 'Alert: repeated scans';

  @override
  String get ptInstallOn => 'Install on work order';

  @override
  String get ptChooseItem => 'Choose the part item';

  @override
  String get ptInstalled => 'Installed — part + labor warranty issued';

  @override
  String get ptLaborWarranty => 'Labor warranty (days)';

  @override
  String get ptWarranties => 'Warranties';

  @override
  String get ptWarrantyPart => 'Part';

  @override
  String get ptWarrantyLabor => 'Labor';

  @override
  String get ptWarrantyBoth => 'Part + labor';

  @override
  String ptValidUntil(String date) {
    return 'Valid until $date';
  }

  @override
  String get ptExpired => 'Expired';

  @override
  String get spRequests => 'Requests';

  @override
  String get spSales => 'My sales';

  @override
  String get spIncoming => 'Requests near you';

  @override
  String get spNoRequests =>
      'No requests right now — you\'ll be notified when a nearby request matches your parts.';

  @override
  String get spHot => 'Ending soonest';

  @override
  String get spBid => 'Submit your bid';

  @override
  String get spYourBid => 'Your bid';

  @override
  String get spUpdateBid => 'Update bid';

  @override
  String get spPrice => 'Your price';

  @override
  String get spEta => 'Delivery within (hours)';

  @override
  String get spWarrantyDays => 'Warranty (days)';

  @override
  String get spNotes => 'Notes';

  @override
  String get spBidSent => 'Bid sent — we\'ll tell you when accepted';

  @override
  String get spWon => 'Accepted';

  @override
  String get spNoRequestsBody =>
      'You will be notified the moment a nearby request matches your parts.';

  @override
  String get spLost => 'Not accepted';

  @override
  String get spOrdersToFulfil => 'Orders to fulfil';

  @override
  String get spPreparing => 'Prepare';

  @override
  String get spShip => 'Shipped';

  @override
  String get spDeliver => 'Delivered';

  @override
  String get spDelivered => 'Delivered';

  @override
  String get spTradeAccounts => 'Trade accounts';

  @override
  String get spApprove => 'Approve account';

  @override
  String get spCreditLimit => 'Credit limit';

  @override
  String get spTermsDays => 'Payment terms (days)';

  @override
  String get spInventory => 'Inventory';

  @override
  String spItems(int n) {
    return '$n items';
  }

  @override
  String get spSerials => 'QR serials';

  @override
  String get spIssueSerials => 'Issue QR batch';

  @override
  String spSerialsIssued(int n, String batch) {
    return '$n serials issued — batch $batch';
  }

  @override
  String get spCatalogId => 'Catalog part id';

  @override
  String get spCount => 'Count';

  @override
  String get spAwaitingPayment => 'Awaiting payment';

  @override
  String get spPaid => 'Paid';

  @override
  String get spConfirmed => 'Confirmed';

  @override
  String get spCancelled => 'Cancelled';

  @override
  String get spDisputed => 'Disputed';

  @override
  String get spReturned => 'Returned';

  @override
  String get spNoOrders => 'No orders yet';

  @override
  String get spNoTrade =>
      'No trade accounts — workshop requests land here for approval.';

  @override
  String get spBeFirst => 'No bids yet — be first';

  @override
  String get reqHubTitle => 'How can we help?';

  @override
  String get reqHubBody => 'Pick what you need now — we handle the rest.';

  @override
  String get reqPart => 'Request a part';

  @override
  String get reqPartBody =>
      'We send your request to workshops, scrapyards and dealers; you pick the best offer.';

  @override
  String get reqTow => 'Request a tow truck';

  @override
  String get reqTowBody =>
      'Move your car to the workshop at a price you know up front.';

  @override
  String get reqMyRequests => 'Part requests';

  @override
  String get reqMyTows => 'Tow requests';

  @override
  String get reqPartVehicle => 'Vehicle';

  @override
  String get reqPartAnyVehicle => 'No specific vehicle';

  @override
  String get reqPartSend => 'Send request';

  @override
  String get towTitle => 'Tow truck';

  @override
  String get towRequestAction => 'Request the tow';

  @override
  String get towRequested =>
      'Request sent — a driver will be with you shortly.';

  @override
  String get towNoHiddenFees => 'Price known up front';

  @override
  String get towQuoteHint =>
      'Set where your car is and where it goes to see the price.';

  @override
  String get towCalculating => 'Calculating the price…';

  @override
  String towQuoteLine(String km, int minutes) {
    return '$km km · about $minutes minutes away';
  }

  @override
  String get towVehicle => 'Your car';

  @override
  String get towNoVehicle => 'No specific vehicle';

  @override
  String get towFrom => 'From';

  @override
  String get towTo => 'To';

  @override
  String get towPickupAddress => 'Location description';

  @override
  String get towPickupHint => 'e.g. King Fahd Road, after exit 12';

  @override
  String get towDropoffAddress => 'Destination description';

  @override
  String get towDropoffHint => 'e.g. Al Noor Workshop — Industrial 2';

  @override
  String get towLocationLink => 'Location link or coordinates';

  @override
  String get towLinkHelp =>
      'Paste the location link from Maps, or type the coordinates.';

  @override
  String get towLinkUnreadable =>
      'We could not read that location — paste the full link or the coordinates.';

  @override
  String get towTruckType => 'Truck type';

  @override
  String get towTypeFlatbed => 'Flatbed';

  @override
  String get towTypeWheelLift => 'Wheel lift';

  @override
  String get towTypeHeavy => 'Heavy tow';

  @override
  String get towNotes => 'Notes';

  @override
  String get towNotesHint => 'e.g. the car will not start';

  @override
  String get towProgress => 'Progress';

  @override
  String get towRoute => 'Route';

  @override
  String get towDriver => 'Driver';

  @override
  String towEta(int minutes) {
    return '$minutes min';
  }

  @override
  String towKm(String km) {
    return '$km km';
  }

  @override
  String get towRequestedAt => 'Requested at';

  @override
  String get towCancelTitle => 'Cancel the tow';

  @override
  String get towCancelBody =>
      'Cancelling is possible only before the car is loaded.';

  @override
  String get towCancelReason => 'Reason (optional)';

  @override
  String get towCancelAction => 'Cancel request';

  @override
  String get towStatusRequested => 'Waiting for a driver';

  @override
  String get towStatusSearching => 'Finding the nearest truck';

  @override
  String get towStatusAssigned => 'Driver assigned';

  @override
  String get towStatusEnRoutePickup => 'Driver on the way to you';

  @override
  String get towStatusPickedUp => 'Your car is on the truck';

  @override
  String get towStatusEnRouteDropoff => 'On the way to the destination';

  @override
  String get towStatusDelivered => 'Delivered';

  @override
  String get towStatusCompleted => 'Completed';

  @override
  String get towStatusCancelled => 'Cancelled';

  @override
  String get towStatusFailed => 'Could not be completed';

  @override
  String get towEmptyTitle => 'No tow requests';

  @override
  String get towEmptyBody => 'Request a tow when your car needs moving.';

  @override
  String get ptCheapest => 'Cheapest';

  @override
  String get ptFastest => 'Fastest';

  @override
  String get ptLongestWarranty => 'Longest warranty';

  @override
  String get ptWarrantiesEmptyTitle => 'No warranties yet';

  @override
  String get ptWarrantiesEmptyBody =>
      'Every part installed through Sinaaty arrives with a digital warranty here.';

  @override
  String get ptWarrantyActive => 'Active';

  @override
  String get ptWarrantyIssuer => 'Guaranteed by';

  @override
  String get ptWarrantyFrom => 'Starts';

  @override
  String get ptWarrantyNumber => 'Warranty no.';

  @override
  String get diffTitle => 'Vehicle condition comparison';

  @override
  String get diffSub => 'Before and after the repair — with photos';

  @override
  String get diffOpen => 'Compare vehicle condition';

  @override
  String get diffCleanTitle => 'Your car, as we received it';

  @override
  String get diffWaiting => 'Waiting for the check-out inspection to compare.';

  @override
  String get diffAppeared => 'Appeared after intake';

  @override
  String get diffWorsened => 'Got worse';

  @override
  String get diffRepaired => 'Repaired';

  @override
  String get diffUnchanged => 'Same as at intake';

  @override
  String get diffCheckIn => 'Intake photos';

  @override
  String get diffCheckOut => 'Handover photos';

  @override
  String get diffAiSuggested => 'System-detected';

  @override
  String get sevMinor => 'Minor';

  @override
  String get sevModerate => 'Moderate';

  @override
  String get sevSevere => 'Severe';

  @override
  String diffFromTo(String from, String to) {
    return 'from $from to $to';
  }

  @override
  String get flToday => 'Your fleet today';

  @override
  String get flVehicles => 'vehicles';

  @override
  String get flOpenRepairs => 'open repairs';

  @override
  String get flAwaiting => 'awaiting your decision';

  @override
  String get flMonthSpend => 'committed this month';

  @override
  String flBudgetLeft(String amount) {
    return '$amount of the budget left';
  }

  @override
  String get flNoPolicy =>
      'No spending policy — every repair needs your approval.';

  @override
  String flPolicyLine(String name, String auto) {
    return 'Policy “$name”: auto-approve below $auto';
  }

  @override
  String get flInboxTitle => 'Awaiting your decision';

  @override
  String get flInboxEmpty => 'Nothing awaits your decision';

  @override
  String get flInboxEmptyBody =>
      'Every repair is either approved or under the auto-approve limit.';

  @override
  String get flNeedsOne => 'Needs one approval';

  @override
  String get flNeedsTwo => 'Needs two approvers';

  @override
  String get flAutoOk => 'Under the limit — ready to sign';

  @override
  String get flBlockedWorkshop => 'Workshop is outside the approved list';

  @override
  String get flOverBudget => 'Exceeds this month\'s budget';

  @override
  String flApprovedBy(String name) {
    return 'Approved by $name';
  }

  @override
  String flRejectedBy(String name) {
    return 'Rejected by $name';
  }

  @override
  String get flApprove => 'Approve the spend';

  @override
  String get flReject => 'Reject';

  @override
  String get flDecisionNote => 'Note (optional)';

  @override
  String get flDecisionHint =>
      'Your decision is recorded in your name. The final signature is a separate step via Nafath or OTP.';

  @override
  String get flReadyToSign => 'Approvals complete — sign now';

  @override
  String get flDecided => 'Your decision was recorded';

  @override
  String get flRejectedDone => 'Rejection recorded — work will not start';

  @override
  String get accTitle => 'Accident report';

  @override
  String get accSub => 'The insurance file linked to this repair';

  @override
  String get accOpen => 'Accident report';

  @override
  String get accLookupLabel => 'Accident reference';

  @override
  String get accLookupHint => 'e.g. ACC-2026-000123';

  @override
  String get accLookup => 'Look up';

  @override
  String get accNotLinked => 'No report linked';

  @override
  String get accNotLinkedBody =>
      'Look up the insurer\'s reference, then link it to this order.';

  @override
  String get accLink => 'Link to this order';

  @override
  String get accLinked => 'Report linked to the order';

  @override
  String get accInsurer => 'Insurer';

  @override
  String get accClaimNo => 'Claim no.';

  @override
  String get accApproved => 'Insurer approved';

  @override
  String get accDeductible => 'Deductible';

  @override
  String get accFault => 'Fault share';

  @override
  String get accCustomerPays => 'Customer expected to pay';

  @override
  String get accDamages => 'Assessor\'s damages';

  @override
  String get accSuggested => 'Suggested work-order lines';

  @override
  String get accSuggestedHint =>
      'From the assessor\'s report — review, price them yourself, then add.';

  @override
  String get accNotPriced =>
      'Still under assessment — no figures yet. Refresh later.';

  @override
  String get accSubmitRepair => 'Register the repair with the provider';

  @override
  String get accSubmitted => 'Repair report registered';

  @override
  String accSubmittedRef(String ref) {
    return 'Registration ref $ref';
  }

  @override
  String accCoverage(String amount) {
    return 'Insurance covers $amount';
  }

  @override
  String get accActRepair => 'Repair';

  @override
  String get accActReplace => 'Replace';

  @override
  String get accActPaint => 'Bodywork & paint';

  @override
  String get towVatIncluded => 'VAT included';

  @override
  String get dsTitle => 'Dispute';

  @override
  String get dsOpen => 'Open a dispute';

  @override
  String get dsActive => 'An open dispute on this order';

  @override
  String get dsView => 'View dispute';

  @override
  String get dsMoneyHeld =>
      'The amount stays held until the dispute is resolved';

  @override
  String get dsPlatformDecides =>
      'The platform reviews both sides and decides — nothing else is needed from you.';

  @override
  String get dsDescribe => 'Describe the problem';

  @override
  String get dsDescribeHint => 'What happened, and what are you asking for?';

  @override
  String get dsCategory => 'Problem type';

  @override
  String get dsAttach => 'Attach a photo';

  @override
  String get dsOpenCta => 'Open the dispute';

  @override
  String get dsOpened => 'Dispute opened — the amount is held until resolved';

  @override
  String get dsMessageHint => 'Write your message…';

  @override
  String get dsEvidence => 'Photos & evidence';

  @override
  String get dsConversation => 'Conversation';

  @override
  String get dsResolved => 'Platform decision';

  @override
  String get dsCatScope => 'Scope of work';

  @override
  String get dsCatQuality => 'Workmanship';

  @override
  String get dsCatPrice => 'Price';

  @override
  String get dsCatDelay => 'Delay';

  @override
  String get dsCatDamage => 'Damage to the car';

  @override
  String get dsCatPartDefect => 'Defective part';

  @override
  String get dsCatNoShow => 'No-show';

  @override
  String get dsStOpen => 'Open';

  @override
  String get dsStUnderReview => 'Under review';

  @override
  String get dsStAwaiting => 'Awaiting the parties';

  @override
  String get dsStEscalated => 'Escalated';

  @override
  String get dsStResolved => 'Decided';

  @override
  String get dsStClosed => 'Closed';

  @override
  String get abTitle => 'Uncollected vehicle';

  @override
  String abNotice(int n) {
    return 'Notice $n';
  }

  @override
  String get abFormal => 'formal';

  @override
  String abDueAfter(int days) {
    return 'Due $days days after ready';
  }

  @override
  String abDaysReady(int days) {
    return 'Ready for $days days';
  }

  @override
  String get abStorage => 'Storage fees';

  @override
  String abFreeThen(int free, String perDay) {
    return '$free free days, then $perDay per day';
  }

  @override
  String get abDeclare => 'Declare vehicle abandoned';

  @override
  String get abDeclareWarn =>
      'A legal, irreversible step: the car is recorded as abandoned and storage fees join the enforcement claim.';

  @override
  String get abDeclared => 'Vehicle declared abandoned';

  @override
  String get abReason => 'Reason (optional)';

  @override
  String get abCustomerReady =>
      'Your car is ready — collect it now. Delays accrue storage fees and the car may legally be deemed abandoned.';

  @override
  String get abCustomerDeclared =>
      'The car was declared abandoned for non-collection — contact the workshop immediately to settle and collect.';

  @override
  String get accAddItems => 'Add to the work order';

  @override
  String get accAddItemsHint =>
      'Added as a new version that needs the customer\'s re-approval.';

  @override
  String get accItemsAdded => 'Items added — send for approval';

  @override
  String get accPriceEach => 'Price each item before adding';

  @override
  String get flStatements => 'Monthly statements';

  @override
  String get flStatementsBody =>
      'A monthly summary of your fleet\'s invoices — accounting-ready.';

  @override
  String get flStatementsEmpty => 'No statements yet';

  @override
  String get flStatementsEmptyBody =>
      'Generate this month\'s statement to get your fleet\'s invoices in one file.';

  @override
  String get flGenerateStatement => 'Generate this month';

  @override
  String get flStatementGenerated => 'Statement ready';

  @override
  String flInvoicesCount(int n) {
    return '$n invoices';
  }

  @override
  String get flCopyCsv => 'Copy CSV';

  @override
  String get flCsvCopied => 'Statement copied — paste it into your sheets';

  @override
  String get srFix => 'Fix my car';

  @override
  String get srFixBody =>
      'Describe the problem and nearby workshops reply with a diagnosis and a price or a free inspection.';

  @override
  String get srDescribe => 'Describe the problem';

  @override
  String get srDescribeHint =>
      'What do you hear or see? A photo says a thousand words.';

  @override
  String get srWhere => 'Your location';

  @override
  String get srWhereHint =>
      'Paste a maps link or coordinates like 24.71, 46.67';

  @override
  String get srRadius => 'Search radius';

  @override
  String srKm(int n) {
    return '$n km';
  }

  @override
  String get srWhen => 'When do you want the repair?';

  @override
  String get srNow => 'Now';

  @override
  String get srToday => 'Today';

  @override
  String get srThisWeek => 'This week';

  @override
  String get srSend => 'Send request';

  @override
  String get srSent => 'Request sent — offers will appear here';

  @override
  String get srMine => 'Repair requests';

  @override
  String get srOffers => 'Offers';

  @override
  String get srNoOffers =>
      'No offers yet — nearby workshops are reviewing your request.';

  @override
  String srWiden(int n) {
    return 'Widen to $n km';
  }

  @override
  String get srWidened => 'Search radius widened';

  @override
  String get srFreeInspection => 'Free inspection';

  @override
  String get srEstimate => 'Estimate';

  @override
  String srPriceRange(String min, String max) {
    return '$min to $max';
  }

  @override
  String get srFinalPriceNote =>
      'The final price is approved after inspection, with your signature — no surprises.';

  @override
  String get srAccepted => 'Offer accepted — work order created';

  @override
  String get srNearestBadge => 'Nearest';

  @override
  String get srTopRatedBadge => 'Top rated';

  @override
  String get srPrevUsedBadge => 'You have used them before';

  @override
  String get srNearby => 'Nearby repair requests';

  @override
  String srNearbyCount(int n) {
    return '$n nearby repair requests';
  }

  @override
  String get srRespond => 'Make your offer';

  @override
  String get srDiagnosis => 'Your diagnosis';

  @override
  String get srDiagnosisHint =>
      'One line on what you think it is — it is what sets your offer apart.';

  @override
  String get srPriceMin => 'Price from';

  @override
  String get srPriceMax => 'to';

  @override
  String get srAvailability => 'When can you take the car?';

  @override
  String get srOfferSent => 'Offer sent';

  @override
  String get srCancelRequest => 'Cancel request';

  @override
  String get srSpecialistBadge => 'Specialists in your car';

  @override
  String srRespondsIn(int n) {
    return 'Replies in ~$n min';
  }

  @override
  String get voSpeak => 'Speak now';

  @override
  String get voListening => 'Listening…';

  @override
  String get voHeardNothing => 'Heard nothing — try again';

  @override
  String get voAgain => 'Again';

  @override
  String get voDone => 'Done';

  @override
  String get voDictateItems => 'Dictate the items';

  @override
  String get voReviewTitle => 'Review what was heard';

  @override
  String voHeard(String text) {
    return 'Heard: $text';
  }

  @override
  String get voNeedsPrice => 'Needs a price';

  @override
  String get voApply => 'Add the priced items';

  @override
  String get voApplied => 'Items added — customer re-approval needed';

  @override
  String get voDiscard => 'Discard';

  @override
  String get voUploadFailed =>
      'The recording did not upload — your text is kept, try again';

  @override
  String get voRetryUpload => 'Retry upload';

  @override
  String get assistantTooltip => 'Voice assistant';

  @override
  String get assistantTitle => 'Speak — I am listening';

  @override
  String get assistantAck => 'On it —';

  @override
  String get assistantTryCustomer =>
      'Did not catch that — try: “order a tow” or “fix my car”';

  @override
  String get assistantTryPartner =>
      'Did not catch that — try: “new order” or “nearby requests”';
}
