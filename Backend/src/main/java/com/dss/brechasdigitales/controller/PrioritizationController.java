// src/main/java/com/dss/brechasdigitales/controller/PrioritizationController.java
package com.dss.brechasdigitales.controller;

import com.dss.brechasdigitales.repository.SimplifiedObservationRepository;
import com.dss.brechasdigitales.service.PrioritizationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController // Controlador REST (respuestas JSON)
@RequestMapping("/api/prioritization") // Prefijo común de los endpoints de priorización
@CrossOrigin(origins = "http://localhost:4200") // Habilita CORS para el front de Angular en dev
public class PrioritizationController {

    @Autowired
    private PrioritizationService prioritizationService; // Servicio con la lógica de priorización

    @Autowired
    private SimplifiedObservationRepository observationRepository; // ✅ Repositorio para consultar catálogos/distintos
                                                                   // valores

    @GetMapping("/regions") // Endpoint: GET /api/prioritization/regions
    public List<PrioritizationService.PriorityRegion> getPriorityRegions(
            @RequestParam String indicator, // Indicador a analizar (ej. "Internet users")
            @RequestParam(defaultValue = "2010") int minYear, // Año mínimo (por defecto 2010)
            @RequestParam(defaultValue = "2025") int maxYear, // Año máximo (por defecto 2025)
            @RequestParam(defaultValue = "All ages") String age // 👈 NUEVO filtro por edad (por defecto "All ages")
    ) {
        // Delegamos en el servicio el cálculo de regiones prioritarias considerando
        // filtros
        return prioritizationService.getPriorityRegions(indicator, minYear, maxYear, age);
    }

    @GetMapping("/indicators") // Endpoint: GET /api/prioritization/indicators
    public List<String> getAvailableIndicators() {
        // Devuelve lista de nombres de indicadores disponibles (distintos) desde BD
        return observationRepository.findDistinctIndicatorNames();
    }

    @GetMapping("/ages") // Endpoint: GET /api/prioritization/ages
    public List<String> getAvailableAges() {
        // Devuelve lista de etiquetas de edad disponibles (distintas) desde BD
        return observationRepository.findDistinctAgeLabels();
    }

    @GetMapping("/sexes") // Endpoint: GET /api/prioritization/sexes
    public List<String> getAvailableSexes() {
        // Devuelve lista de etiquetas de sexo disponibles (distintas) desde BD
        return observationRepository.findDistinctSexLabels();
    }

    @GetMapping("/urbanisations") // Endpoint: GET /api/prioritization/urbanisations
    public List<String> getAvailableUrbanisations() {
        // Devuelve lista de etiquetas de urbanización disponibles (distintas) desde BD
        return observationRepository.findDistinctUrbanisationLabels();
    }
}
