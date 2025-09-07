package com.dss.brechasdigitales.controller;   // Paquete donde vive este controlador REST

// ======================= IMPORTS =======================
// Utilidades de colecciones para devolver resultados
import java.util.List;

// Infraestructura de Spring para inyección de dependencias y manejo HTTP
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
// Anotaciones para definir endpoints REST y su mapeo
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
// Soporte para recibir archivos enviados por formulario (multipart/form-data)
import org.springframework.web.multipart.MultipartFile;

// Servicio de aplicación que procesa el CSV
import com.dss.brechasdigitales.service.SimplifiedCsvService;

@RestController                                     // Marca la clase como controlador REST (retorna JSON/HTTP)
@RequestMapping("/api/import")                      // Prefijo común para todos los endpoints de esta clase
@CrossOrigin(origins = "http://localhost:4200")     // Habilita CORS para el front de Angular en desarrollo
public class DataImportController {

     @Autowired
    private SimplifiedCsvService csvService;        // Servicio inyectado que contiene la lógica de parseo del CSV

    // Constructor explícito (permite inyección por constructor si se desea)
    public DataImportController (SimplifiedCsvService csvService) {
        this.csvService = csvService;
    }
    
    // ================================================================
    // Endpoint: POST /api/import/upload
    // - Recibe un archivo con el parámetro "file" (multipart/form-data).
    // - Valida que no venga vacío; si lo está, responde 400 Bad Request.
    // - Delega al servicio 'csvService' el procesamiento del CSV.
    // - Devuelve una lista de mensajes/filas procesadas con 200 OK.
    // ================================================================
    @PostMapping("/upload")
    public ResponseEntity<List<String>> uploadFile(@RequestParam("file") MultipartFile file) {
        // Validación básica: si no hay contenido, retornamos error 400 con mensaje
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(List.of("⚠ El archivo está vacío"));
        }

        // Procesar el archivo y obtener los resultados (mensajes, líneas importadas, etc.)
        List<String> results = csvService.processCsvFile(file);

        // Responder 200 OK con la lista de resultados
        return ResponseEntity.ok(results);
    }
    
}
