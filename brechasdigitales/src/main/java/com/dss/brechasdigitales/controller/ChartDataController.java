package com.dss.brechasdigitales.controller;

// ======================= IMPORTS =======================
// List y Map para colecciones de datos que se devuelven en las respuestas
import java.util.List;
import java.util.Map;

// Infraestructura de Spring para inyección de dependencias y HTTP
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
// Anotaciones para definir un controlador REST y sus endpoints
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// Clases propias del dominio
import com.dss.brechasdigitales.entity.SimplifiedObservation;
import com.dss.brechasdigitales.service.DataService;

/**
 * Controlador REST que expone endpoints para alimentar las gráficas del frontend.
 * Permite consultar series de tiempo, comparativos por país, indicadores disponibles,
 * años disponibles y también obtener todas las observaciones simplificadas.
 */
@RestController                           // Indica que esta clase maneja peticiones REST y devuelve JSON
@RequestMapping("/api/chart-data")        // Prefijo común para todos los endpoints de este controlador
@CrossOrigin(origins = "*")               // Habilita CORS (útil para que Angular en desarrollo pueda consumir la API)
public class ChartDataController {

    @Autowired
    private DataService dataService;      // Servicio de acceso a datos (repositorios/consultas y lógica)

    /**
     * GET /api/chart-data/time-series
     * Devuelve la serie de tiempo para un país y un indicador concretos.
     *
     * @param countryCode  código del país (por ejemplo "COL")
     * @param indicatorName nombre del indicador a consultar
     * @return lista de observaciones simplificadas ordenadas por tiempo
     */
    @GetMapping("/time-series")
    public ResponseEntity<List<SimplifiedObservation>> getTimeSeriesData(
            @RequestParam String countryCode,   // Parámetro de query obligatorio
            @RequestParam String indicatorName) // Parámetro de query obligatorio
    {
        // Delegamos en el servicio la obtención de los datos
        List<SimplifiedObservation> data = dataService.getTimeSeriesData(countryCode, indicatorName);
        // Envolvemos la respuesta en un 200 OK con el body en JSON
        return ResponseEntity.ok(data);
    }

    /**
     * GET /api/chart-data/country-comparison
     * Devuelve valores de un indicador para múltiples países en un año específico
     * (útil para gráficos comparativos por país).
     *
     * @param year          año a consultar (ej. 2020)
     * @param indicatorName nombre del indicador
     * @return lista de observaciones (cada una asociada a un país)
     */
    @GetMapping("/country-comparison")
    public ResponseEntity<List<SimplifiedObservation>> getCountryComparison(
            @RequestParam Integer year,         // Año a filtrar
            @RequestParam String indicatorName) // Indicador a filtrar
    {
        List<SimplifiedObservation> data = dataService.getCountryComparison(year, indicatorName);
        return ResponseEntity.ok(data);
    }

    /**
     * GET /api/chart-data/indicators
     * Devuelve el catálogo de indicadores disponibles.
     *
     * @return mapa clave-valor (por ejemplo, id -> nombre legible)
     */
    @GetMapping("/indicators")
    public ResponseEntity<Map<String, String>> getAvailableIndicators() {
        return ResponseEntity.ok(dataService.getAvailableIndicators());
    }

    /**
     * GET /api/chart-data/years
     * Devuelve los años disponibles para un indicador dado (útil para poblar combos/filtros).
     *
     * @param indicatorName indicador para el que se consultan los años
     * @return lista de años disponibles (enteros)
     */
    @GetMapping("/years")
    public ResponseEntity<List<Integer>> getAvailableYears(@RequestParam String indicatorName) {
        return ResponseEntity.ok(dataService.getAvailableYears(indicatorName));
    }

    /**
     * GET /api/chart-data/all
     * Devuelve todas las observaciones simplificadas disponibles.
     * Útil para precargar datos o diagnósticos.
     *
     * @return lista completa de observaciones simplificadas
     */
    @GetMapping("/all")
    public ResponseEntity<List<SimplifiedObservation>> getAllData() {
        return ResponseEntity.ok(dataService.getAllData());
    }
}
