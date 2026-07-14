import 'package:flutter/material.dart';
import 'package:sensors_plus/sensors_plus.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'dart:math';

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
  bool _isLoading = true;
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    _initPermissions();
  }

  @override
  void dispose() {
    accelerometerEvents.close();
    magnetometerEvents.close();
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

    // Request sensor permissions (for Android 13+)
    final sensorStatus = await Permission.sensors.request();
    if (sensorStatus.isGranted) {
      _startCompassUpdates();
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
        setState(() {
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
    // Combine accelerometer and magnetometer to get azimuth
    // This is a simplified approach - for production, consider using a proper sensor fusion library
    
    // We'll use the device's built-in compass via accelerometer + magnetometer
    // For simplicity, we'll use the accelerometer events which on most devices include device orientation
    accelerometerEvents.listen((AccelerometerEvent event) {
      // This gives us device orientation in 3D space
      // We need to combine with magnetometer for true north
    });

    // Better approach: use magnetometer for compass heading
    magnetometerEvents.listen((MagnetometerEvent event) {
      // Calculate heading from magnetometer
      // This is a simplified calculation
      final heading = atan2(event.y, event.x) * (180 / pi);
      setState(() {
        _heading = heading;
      });
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Simple Compass'),
        centerTitle: true,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Compass Display
            SizedBox(
              width: 250,
              height: 250,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Compass Rose
                  Transform.rotate(
                    angle: _heading * (pi / 180) * -1,
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
                              _getCompassDirection(_heading),
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
                    angle: _heading * (pi / 180),
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
              '${_heading.toStringAsFixed(1)}°',
              style: const TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            
            const SizedBox(height: 20),
            
            // Direction text
            Text(
              _getCompassDirection(_heading),
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
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
          ],
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
