package com.dss.brechasdigitales.service; // Paquete donde se define el servicio de acceso a datos

// ======================= IMPORTS =======================
// Estructuras de datos y utilidades de streams para transformar colecciones
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// Infraestructura Spring para inyección y estereotipo de servicio
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

// Entidad del dominio y repositorio de acceso a BD
import com.dss.brechasdigitales.entity.SimplifiedObservation;
import com.dss.brechasdigitales.repository.SimplifiedObservationRepository;

@Service // Marca la clase como componente de servicio (gestionado por el contenedor de Spring)
public class DataService {

    @Autowired
    private SimplifiedObservationRepository observationRepository; // Repositorio JPA para consultar la tabla de observaciones
    
    /**
     * Obtiene una serie de tiempo para un país y un indicador,
     * ordenada por el campo temporal (timePeriod).
     */
    public List<SimplifiedObservation> getTimeSeriesData(String countryCode, String indicatorName) {
        return observationRepository.findByCountryCodeAndIndicatorNameOrderByTimePeriod(countryCode, indicatorName);
    }
    
    /**
     * Obtiene datos de un indicador para un año específico a través de países,
     * ordenados de forma descendente por el valor observado (obsValue),
     * útil para comparativos por país.
     */
    public List<SimplifiedObservation> getCountryComparison(Integer year, String indicatorName) {
        return observationRepository.findByTimePeriodAndIndicatorNameOrderByObsValueDesc(year, indicatorName);
    }
    
    /**
     * Devuelve un mapa de indicadores disponibles.
     * Actualmente usa el mismo texto como clave y como valor (puede adaptarse a etiquetas amigables).
     */
    public Map<String, String> getAvailableIndicators() {
        List<String> indicators = observationRepository.findDistinctIndicatorNames();
        return indicators.stream()
                .collect(Collectors.toMap(
                        indicator -> indicator, 
                        indicator -> indicator // O podrías tener un mapa de nombres más amigables
                ));
    }
    
    /**
     * Devuelve la lista de años disponibles para un indicador dado.
     */
    public List<Integer> getAvailableYears(String indicatorName) {
        return observationRepository.findAvailableYears(indicatorName);
    }
    
    /**
     * Devuelve, por cada indicador, el último año disponible.
     * Se espera que el repositorio retorne una lista de Object[] con [indicatorName, latestYear],
     * que aquí se transforma a un Map<String, Integer>.
     */
    public Map<String, Integer> getLatestData() {
        return observationRepository.findLatestYearsPerIndicator().stream()
                .collect(Collectors.toMap(
                        result -> (String) result[0],
                        result -> (Integer) result[1]
                ));
    }

    /**
     * Devuelve todas las observaciones simplificadas (sin filtros).
     */
    public List<SimplifiedObservation> getAllData() {
        return observationRepository.findAll();
    }
    
}
