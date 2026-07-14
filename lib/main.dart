import 'package:flutter/material.dart';
import 'package:sensors_plus/sensors_plus.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'dart:math';
import 'dart:async';
import 'package:flutter/foundation.dart';

void main() {
  runApp(const CompassApp());
}

class CompassApp extends StatelessWidget {
  const CompassApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Simple Compass',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.blue,
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: const CompassScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class CompassScreen extends StatefulWidget {
  const CompassScreen({super.key});

  @override
  State<CompassScreen> createState() => _CompassScreenState();
}

class _CompassScreenState extends State<CompassScreen> {
  double _heading = 0.0;
  Position? _position;
  Position? _previousPosition;
  bool _isLoading = true;
  String _errorMessage = '';
  bool _compassAvailable = true;
  double? _gpsHeading;
  StreamSubscription<AccelerometerEvent>? _accelerometerSubscription;
  StreamSubscription<MagnetometerEvent>? _magnetometerSubscription;

  @override
  void initState() {
    super.initState();
    _checkPlatform();
    _initPermissions();
  }

  void _checkPlatform() {
    // On web, compass (magnetometer) is not available in most browsers
    if (kIsWeb) {
      setState(() {
        _compassAvailable = false;
      });
    }
  }

  @override
  void dispose() {
    _accelerometerSubscription?.cancel();
    _magnetometerSubscription?.cancel();
    super.dispose();
  }

  Future<void> _initPermissions() async {
    // Request location permissions
    final locationStatus = await Permission.locationWhenInUse.request();
    
    if (locationStatus.isGranted) {
      _startLocationUpdates();
    } else {
      setState(() {
        _errorMessage = 'Location permission denied';
        _isLoading = false;
      });
    }

    // On mobile, request sensor permissions
    if (!kIsWeb) {
      final sensorStatus = await Permission.sensors.request();
      if (sensorStatus.isGranted) {
        _startCompassUpdates();
      } else {
        setState(() {
          _compassAvailable = false;
        });
      }
    }
  }

  void _startLocationUpdates() {
    Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 1, // Update every 1 meter
      ),
    ).listen(
      (Position position) {
        // Calculate GPS heading if we have previous position and we're moving
        if (_previousPosition != null && !kIsWeb) {
          final speed = position.speed;
          if (speed > 0.5) { // Only calculate heading if moving faster than 0.5 m/s
            final dy = position.latitude - _previousPosition!.latitude;
            final dx = position.longitude - _previousPosition!.longitude;
            // Calculate bearing in degrees
            final bearing = atan2(dx, dy) * (180 / pi);
            setState(() {
              _gpsHeading = (bearing + 360) % 360;
            });
          }
        }
        
        setState(() {
          _previousPosition = _position;
          _position = position;
          _isLoading = false;
        });
      },
      onError: (e) {
        setState(() {
          _errorMessage = 'Location error: ${e.toString()}';
          _isLoading = false;
        });
      },
    );
  }

  void _startCompassUpdates() {
    if (kIsWeb) return;

    // Use magnetometer for compass heading
    _magnetometerSubscription = magnetometerEvents.listen((MagnetometerEvent event) {
      // Calculate heading from magnetometer
      final heading = atan2(event.y, event.x) * (180 / pi);
      setState(() {
        _heading = heading;
      });
    });

    // Also listen to accelerometer for device orientation
    _accelerometerSubscription = accelerometerEvents.listen((AccelerometerEvent event) {
      // This can be used for device tilt detection
    });
  }

  String _getCompassDirection(double heading) {
    const directions = [
      'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
    ];
    
    // Normalize heading to 0-360
    final normalizedHeading = heading % 360;
    final index = ((normalizedHeading + 11.25) / 22.5).floor() % 16;
    return directions[index];
  }

  double _getDisplayHeading() {
    // On web without compass, use GPS heading if available
    if (!kIsWeb || _compassAvailable) {
      return _heading;
    }
    // On web, use GPS heading if available
    if (_gpsHeading != null) {
      return _gpsHeading!;
    }
    // Default to 0 if no heading available
    return 0.0;
  }

  @override
  Widget build(BuildContext context) {
    final displayHeading = _getDisplayHeading();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Simple Compass'),
        centerTitle: true,
        actions: [
          if (kIsWeb)
            IconButton(
              icon: const Icon(Icons.info_outline),
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: const Text('Web Limitations'),
                    content: const Text(
                      'On web, true compass (magnetometer) is not available. '
                      'Heading is calculated from GPS movement when moving. '
                      'For full compass functionality, use the native app.',
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('OK'),
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
      body: Center(
        child: SingleChildScrollView(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Platform indicator
              if (kIsWeb)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8.0),
                  child: Text(
                    'Web Version - Limited Compass',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.orange.withOpacity(0.7),
                    ),
                  ),
                ),
              
              // Compass Display
              SizedBox(
                width: 250,
                height: 250,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Compass Rose
                    Transform.rotate(
                      angle: displayHeading * (pi / 180) * -1,
                      child: Container(
                        width: 200,
                        height: 200,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                          color: Colors.blue.withOpacity(0.3),
                        ),
                        child: Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Text(
                                'N',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 80),
                              Text(
                                _getCompassDirection(displayHeading),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 80),
                              const Text(
                                'S',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    // Compass Needle (fixed, points north)
                    Transform.rotate(
                      angle: displayHeading * (pi / 180),
                      child: Container(
                        width: 180,
                        height: 180,
                        child: CustomPaint(
                          painter: CompassNeedlePainter(),
                        ),
                      ),
                    ),
                    // Center point
                    Container(
                      width: 12,
                      height: 12,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.red,
                      ),
                    ),
                  ],
                ),
              ),
              
              const SizedBox(height: 40),
              
              // Heading in degrees
              Text(
                '${displayHeading.toStringAsFixed(1)}°',
                style: const TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              
              const SizedBox(height: 20),
              
              // Direction text
              Text(
                _getCompassDirection(displayHeading),
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              
              // GPS Heading indicator (for web)
              if (kIsWeb && _gpsHeading != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text(
                    'GPS Heading: ${_gpsHeading!.toStringAsFixed(1)}°',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.green.withOpacity(0.8),
                    ),
                  ),
                ),
              
              const SizedBox(height: 40),
              
              // GPS Coordinates
              if (_isLoading)
                const CircularProgressIndicator(),
              
              if (_errorMessage.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Text(
                    _errorMessage,
                    style: const TextStyle(color: Colors.red),
                    textAlign: TextAlign.center,
                  ),
                ),
              
              if (_position != null)
                Column(
                  children: [
                    const Text(
                      'GPS Coordinates',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white70,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Latitude: ${_position!.latitude.toStringAsFixed(6)}°',
                      style: const TextStyle(
                        fontSize: 16,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      'Longitude: ${_position!.longitude.toStringAsFixed(6)}°',
                      style: const TextStyle(
                        fontSize: 16,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      'Altitude: ${_position!.altitude != 0 ? _position!.altitude.toStringAsFixed(1) : 'N/A'} m',
                      style: const TextStyle(
                        fontSize: 16,
                        color: Colors.white,
                      ),
                    ),
                    if (_position!.speed > 0)
                      Text(
                        'Speed: ${_position!.speed.toStringAsFixed(1)} m/s',
                        style: const TextStyle(
                          fontSize: 16,
                          color: Colors.white,
                        ),
                      ),
                    const SizedBox(height: 8),
                    Text(
                      'Accuracy: ${_position!.accuracy.toStringAsFixed(1)} m',
                      style: const TextStyle(
                        fontSize: 14,
                        color: Colors.white70,
                      ),
                    ),
                  ],
                ),
              
              const SizedBox(height: 20),
              
              // Platform-specific notes
              if (kIsWeb)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20.0),
                  child: Text(
                    'Note: For full compass functionality, install the native app on Android or iOS.',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.white.withOpacity(0.6),
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class CompassNeedlePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final needleLength = size.width * 0.45;
    final needleWidth = 8.0;

    // Draw needle (triangle pointing north)
    final needlePath = Path();
    needlePath.moveTo(center.dx, center.dy - needleLength);
    needlePath.lineTo(center.dx + needleWidth, center.dy);
    needlePath.lineTo(center.dx - needleWidth, center.dy);
    needlePath.close();

    canvas.drawPath(
      needlePath,
      Paint()
        ..color = Colors.white
        ..style = PaintingStyle.fill,
    );

    // Draw needle outline
    canvas.drawPath(
      needlePath,
      Paint()
        ..color = Colors.black
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );

    // Draw center circle
    canvas.drawCircle(
      center,
      6,
      Paint()
        ..color = Colors.red
        ..style = PaintingStyle.fill,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
