import 'package:dio/dio.dart';

class ApiService {
  final Dio _dio;

  const ApiService(this._dio);

  Future<Response<dynamic>> get(
    String path, {
    Map<String, dynamic>? params,
  }) =>
      _dio.get(path, queryParameters: params);

  Future<Response<dynamic>> post(
    String path, {
    Map<String, dynamic>? data,
  }) =>
      _dio.post(path, data: data);

  Future<Response<dynamic>> put(
    String path, {
    Map<String, dynamic>? data,
  }) =>
      _dio.put(path, data: data);

  Future<Response<dynamic>> delete(String path) => _dio.delete(path);
}
