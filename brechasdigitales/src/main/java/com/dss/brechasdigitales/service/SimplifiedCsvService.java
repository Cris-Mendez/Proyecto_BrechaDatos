package com.dss.brechasdigitales.service;

// ======================= IMPORTS =======================
// Clases para leer el archivo CSV
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
// Estructuras de datos
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
// Librerías Apache Commons CSV para parsear archivos CSV
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
// Spring: inyección, anotación de servicio, transacciones, manejo de archivos
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
// Entidad y repositorio del dominio
import com.dss.brechasdigitales.entity.SimplifiedObservation;
import com.dss.brechasdigitales.repository.SimplifiedObservationRepository;

@Service // Marca esta clase como un servicio de Spring
public class SimplifiedCsvService {

    @Autowired
    private SimplifiedObservationRepository observationRepository; // Repositorio para persistir entidades

    private static final int BATCH_SIZE = 2000; // Tamaño del lote para inserciones en BD

    /**
     * Procesa un archivo CSV subido desde el frontend.
     * Lee, valida y convierte los registros a entidades SimplifiedObservation.
     * Inserta en lotes para mejorar el rendimiento.
     */
    @Transactional // Ejecuta dentro de una transacción (mejor rendimiento al guardar lotes)
    public List<String> processCsvFile(MultipartFile file) {
        List<String> results = new ArrayList<>();         // Lista de mensajes de resultado
        AtomicInteger processed = new AtomicInteger(0);   // Contador de registros procesados
        AtomicInteger skipped = new AtomicInteger(0);     // Contador de registros omitidos
        long startTime = System.currentTimeMillis();      // Marca de inicio para medir tiempo

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {

            // Configuración del parser CSV: con encabezado, ignora mayúsculas/minúsculas, trim espacios
            CSVFormat format = CSVFormat.DEFAULT.builder()
                    .setHeader()
                    .setSkipHeaderRecord(true)
                    .setIgnoreHeaderCase(true)
                    .setTrim(true)
                    .build();

            try (CSVParser csvParser = new CSVParser(reader, format)) {

                List<SimplifiedObservation> batch = new ArrayList<>(BATCH_SIZE); // Lote de observaciones
                final int[] counter = {0}; // Contador de lotes guardados

                // Recorrer cada registro del CSV como stream
                csvParser.stream().forEach(record -> {
                    try {
                        // Convertir el registro CSV a entidad
                        SimplifiedObservation observation = mapCsvToObservation(record);
                        if (observation != null) {
                            batch.add(observation);
                            processed.incrementAndGet();

                            // Guardar en BD cuando el lote alcanza el tamaño límite
                            if (batch.size() >= BATCH_SIZE) {
                                observationRepository.saveAll(batch);
                                batch.clear();
                                System.out.println("Procesado lote: " + (++counter[0] * BATCH_SIZE) + " registros");
                            }
                        } else {
                            skipped.incrementAndGet(); // Registro omitido por datos inválidos
                        }
                    } catch (Exception e) {
                        skipped.incrementAndGet();
                        results.add("Error en línea " + record.getRecordNumber() + ": " + e.getMessage());
                    }
                });

                // Guardar los registros restantes si hay alguno
                if (!batch.isEmpty()) {
                    observationRepository.saveAll(batch);
                }

                // Calcular métricas de rendimiento
                long endTime = System.currentTimeMillis();
                double seconds = (endTime - startTime) / 1000.0;
                
                results.add(0, "✅ Procesamiento completado: " + processed.get() + 
                        " registros importados, " + skipped.get() + " registros omitidos");
                results.add("⏱ Tiempo total: " + seconds + " segundos");
                results.add("📊 Velocidad: " + String.format("%.2f", processed.get() / seconds) + " registros/segundo");
            }

        } catch (Exception e) {
            // Cualquier error grave se envuelve en RuntimeException
            throw new RuntimeException("Error procesando archivo CSV: " + e.getMessage(), e);
        }

        return results;
    }

    /**
     * Convierte un registro CSV en un objeto SimplifiedObservation.
     * Valida campos obligatorios y convierte valores numéricos.
     */
    private SimplifiedObservation mapCsvToObservation(CSVRecord record) {
        // Validar que las columnas mínimas existen
        if (!record.isMapped("REF_AREA") || !record.isMapped("INDICATOR_LABEL") ||
            !record.isMapped("TIME_PERIOD") || !record.isMapped("OBS_VALUE")) {
            return null;
        }

        String obsValueStr = record.get("OBS_VALUE");
        if (obsValueStr == null || obsValueStr.trim().isEmpty()) {
            return null; // Si no hay valor de observación, omitir
        }

        try {
            SimplifiedObservation observation = new SimplifiedObservation();
            observation.setCountryCode(record.get("REF_AREA"));
            observation.setCountryName(record.get("REF_AREA_LABEL"));
            observation.setIndicatorName(record.get("INDICATOR_LABEL"));
            observation.setTimePeriod(Integer.parseInt(record.get("TIME_PERIOD")));
            observation.setObsValue(Double.parseDouble(obsValueStr));
            observation.setUnitMeasure(record.get("UNIT_MEASURE_LABEL"));
            observation.setSexLabel(getOptionalValue(record, "SEX_LABEL", "Total"));
            observation.setAgeLabel(getOptionalValue(record, "AGE_LABEL", "All ages"));
            observation.setUrbanisationLabel(getOptionalValue(record, "URBANISATION_LABEL", "Total"));
            return observation;

        } catch (NumberFormatException e) {
            // Error si un campo numérico no se puede convertir
            throw new RuntimeException("Valor numérico inválido en la línea: " + record.getRecordNumber());
        }
    }

    /**
     * Obtiene un valor opcional de una columna del CSV.
     * Si no existe o está vacío, devuelve un valor por defecto.
     */
    private String getOptionalValue(CSVRecord record, String column, String defaultValue) {
        try {
            String value = record.get(column);
            return (value == null || value.trim().isEmpty()) ? defaultValue : value;
        } catch (IllegalArgumentException e) {
            return defaultValue; // Si la columna no existe
        }
    }
}
