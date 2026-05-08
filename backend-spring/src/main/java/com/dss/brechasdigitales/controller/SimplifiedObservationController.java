package com.dss.brechasdigitales.controller;

// ======================= IMPORTS =======================
// Entidad JPA que representa una observación simplificada
import com.dss.brechasdigitales.entity.SimplifiedObservation;
// Repositorio Spring Data para consultar la base de datos
import com.dss.brechasdigitales.repository.SimplifiedObservationRepository;
// Anotaciones de Spring Web para construir el controlador REST
import org.springframework.web.bind.annotation.*;

// Estructuras de datos Java
import java.util.List;

@RestController // Declara un controlador REST (retorna JSON por defecto)
@RequestMapping("/api/observations") // Prefijo común para todos los endpoints de esta clase
@CrossOrigin(origins = "http://localhost:4200") // Permite solicitudes CORS desde el front de Angular (puerto 4200)
public class SimplifiedObservationController {

    private final SimplifiedObservationRepository repository; // Repositorio inyectado para acceder a la capa de datos

    // Inyección por constructor (recomendada en Spring)
    public SimplifiedObservationController(SimplifiedObservationRepository repository) {
        this.repository = repository;
    }

    // ======================= ENDPOINTS =======================

    // GET /api/observations
    // Obtiene TODAS las observaciones disponibles en la tabla.
    @GetMapping
    public List<SimplifiedObservation> getAll() {
        return repository.findAll();
    }

    // GET /api/observations/country/{countryCode}
    // Obtiene las observaciones filtradas por código de país (p. ej. "COL", "PER").
    // {countryCode} se captura como @PathVariable.
    @GetMapping("/country/{countryCode}")
    public List<SimplifiedObservation> getByCountry(@PathVariable String countryCode) {
        return repository.findByCountryCode(countryCode);
    }

    // GET /api/observations/indicator/{indicatorName}
    // Obtiene las observaciones filtradas por nombre de indicador (p. ej. "Internet
    // users").
    @GetMapping("/indicator/{indicatorName}")
    public List<SimplifiedObservation> getByIndicator(@PathVariable String indicatorName) {
        return repository.findByIndicatorName(indicatorName);
    }

    // GET /api/observations/year/{timePeriod}
    // Obtiene las observaciones filtradas por año (timePeriod).
    @GetMapping("/year/{timePeriod}")
    public List<SimplifiedObservation> getByYear(@PathVariable Integer timePeriod) {
        return repository.findByTimePeriod(timePeriod);
    }

    // GET /api/observations/all
    // **Equivalente funcionalmente a getAll()** (también retorna todas las
    // observaciones).
    // Se mantiene por compatibilidad o conveniencia de rutas.
    @GetMapping("/all")
    public List<SimplifiedObservation> getAllObservations() {
        return repository.findAll();
    }
}
