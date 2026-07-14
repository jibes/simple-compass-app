# Simple Compass App

A cross-platform compass application for Android and iOS that displays:
- Compass heading (degrees and cardinal direction)
- Real-time GPS coordinates (latitude, longitude)
- Altitude (when available)

## Features

- **Compass Display**: Shows current heading with a rotating compass rose
- **GPS Coordinates**: Displays latitude, longitude, and altitude
- **Real-time Updates**: Continuously updates as you move
- **Permissions Handling**: Automatically requests location and sensor permissions

## Screenshots

The app displays:
1. A circular compass with North indicator
2. Current heading in degrees
3. Cardinal direction (N, NE, E, SE, S, SW, W, NW)
4. GPS coordinates (latitude, longitude)
5. Altitude in meters
6. GPS accuracy

## Setup

### Prerequisites

- [Flutter SDK](https://flutter.dev/docs/get-started/install) (version 3.0.0 or higher)
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- Android device or emulator (API 24+)
- iOS device or simulator (iOS 12.0+)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/jibes/simple-compass-app.git
   cd simple-compass-app
   ```

2. **Install dependencies:**
   ```bash
   flutter pub get
   ```

3. **For Android:**
   - Open Android Studio
   - Open the `android` folder
   - Let Gradle sync
   - Run on an Android device/emulator

4. **For iOS:**
   ```bash
   cd ios
   pod install
   cd ..
   ```
   - Open Xcode
   - Open the `ios` folder
   - Select your development team
   - Run on an iOS device/simulator

### Running the App

**From command line:**
```bash
# Android
flutter run -d android

# iOS
flutter run -d ios
```

**From IDE:**
- Open in Android Studio or VS Code with Flutter plugin
- Select target device
- Click Run

## Permissions

The app requires the following permissions:

### Android
- `ACCESS_FINE_LOCATION` - For precise GPS coordinates
- `ACCESS_COARSE_LOCATION` - For approximate location
- `ACCESS_BACKGROUND_LOCATION` - For location updates in background (optional)
- Sensor access for compass functionality

### iOS
- Location When In Use - For GPS coordinates while app is open
- Location Always And When In Use - For continuous location updates

## Dependencies

- [flutter](https://pub.dev/packages/flutter) - Flutter framework
- [sensors_plus](https://pub.dev/packages/sensors_plus) - Access to device sensors (accelerometer, magnetometer)
- [geolocator](https://pub.dev/packages/geolocator) - GPS location services
- [permission_handler](https://pub.dev/packages/permission_handler) - Permission management

## Project Structure

```
simple_compass_app/
├── lib/
│   └── main.dart          # Main app code
├── android/               # Android platform code
├── ios/                   # iOS platform code
├── pubspec.yaml           # Flutter dependencies
└── README.md              # This file
```

## Troubleshooting

### Android
- **Location not working**: Ensure location services are enabled on your device
- **Permission denied**: Check that you've granted location permissions in app settings
- **Compass not accurate**: Calibrate your device's compass by moving it in a figure-8 pattern

### iOS
- **Location permission denied**: Go to Settings > Privacy > Location Services and enable for this app
- **Simulator location**: Use Features > Location > Custom Location in the simulator menu
- **Compass not available**: The simulator doesn't have a real compass; test on a physical device

### General
- **App crashes on startup**: Run `flutter clean` and `flutter pub get`, then rebuild
- **Dependencies not found**: Run `flutter pub get` to install dependencies
- **Build errors**: Ensure you're using a compatible Flutter version (check `pubspec.yaml`)

## Customization

You can customize the app by modifying `lib/main.dart`:

- Change colors in the `ThemeData`
- Adjust compass size and appearance
- Modify coordinate display format
- Add additional features like:
  - Speed display
  - Distance traveled
  - Compass calibration
  - Map integration

## License

MIT License - Feel free to use, modify, and distribute this code.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
