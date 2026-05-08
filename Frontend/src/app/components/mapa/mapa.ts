import {
  Component,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChild,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import * as echarts from 'echarts';
import { Observation, ObservationService } from '../../services/observation';

import { interval, switchMap } from 'rxjs';

// Tipos auxiliares para posicionamiento del tooltip
type TooltipSize = { contentSize: number[]; viewSize: number[] };
type TooltipRect = { x: number; y: number; width: number; height: number } | null;

@Component({
  selector: 'app-mapa',                 // Selector del componente en la plantilla
  standalone: true,                     // Componente standalone (sin módulo)
  imports: [],                          // No importa módulos adicionales aquí
  templateUrl: './mapa.html',           // Ruta a la plantilla HTML
  styleUrls: ['./mapa.css'],            // Estilos del componente
})
export class MapaComponent implements OnInit, AfterViewInit {
  @ViewChild('chart', { static: true }) chartElement!: ElementRef; // Referencia al contenedor del gráfico
  private chart!: echarts.ECharts;       // Instancia de ECharts
  private chartData: any[] = [];         // Datos agregados por país (último año)

  constructor(
    private http: HttpClient,                    // Cliente HTTP para cargar el mapa (world.json)
    private observationService: ObservationService, // Servicio para obtener observaciones
    @Inject(PLATFORM_ID) private platformId: Object // Plataforma (navegador/servidor) para SSR-safe
  ) { }

  ngOnInit(): void { }                   // Hook de inicialización (no se usa aquí)

  ngAfterViewInit(): void {
    // Solo ejecutar en navegador (evita errores en SSR)
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.inicializarMapa(), 0); // Inicializa el mapa tras renderizar la vista
      window.addEventListener('resize', () => this.chart?.resize()); // Responsivo al redimensionar

      // Reconsultar datos cada 30 segundos y actualizar el mapa
      interval(30000).pipe(
        switchMap(() => this.observationService.getAll())
      ).subscribe(observations => {
        this.actualizarDatos(observations);
      });
    }
  }

  /** Calcula una posición de tooltip que no se salga del viewport */
  private tooltipPosition(
    point: number[],                     // [mouseX, mouseY]
    _params: unknown,                    // parámetros del punto (no usados)
    _dom: HTMLElement,                   // elemento DOM del tooltip (no usado)
    _rect: TooltipRect,                  // rectángulo del elemento (no usado)
    size: TooltipSize                    // tamaño del tooltip y del viewport
  ): number[] {
    const [mouseX, mouseY] = point;
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;
    const boxWidth = size.contentSize[0];
    const boxHeight = size.contentSize[1];

    // Posición por defecto (desplazada del cursor)
    let x = mouseX + 15;
    let y = mouseY + 15;

    // Si se sale a la derecha/abajo, reposicionar a la izquierda/arriba
    if (x + boxWidth > viewWidth - 10) x = mouseX - boxWidth - 15;
    if (y + boxHeight > viewHeight - 10) y = mouseY - boxHeight - 15;

    // Margen mínimo respecto a los bordes
    x = Math.max(10, x);
    y = Math.max(10, y);

    return [x, y];
  }

  // Inicializa ECharts, carga el mapa mundial y pinta datos agregados
  private inicializarMapa() {
    this.chart = echarts.init(this.chartElement.nativeElement); // Crea la instancia sobre el elemento referenciado

    // Muestra indicador de carga mientras se prepara el mapa
    this.chart.showLoading('default', {
      text: 'Cargando mapa...',
      color: '#005f73',
    });

    // Carga el geojson del mundo desde assets
    this.http.get('assets/world.json').subscribe((worldMap: any) => {
      echarts.registerMap('world', worldMap); // Registra el mapa bajo el nombre 'world'

      // Configuración base del gráfico (tooltip, navegación, serie vacía)
      this.chart.setOption({
        tooltip: {
          trigger: 'item',
          confine: true,                    // Limita el tooltip al contenedor
          appendToBody: true,               // Inserta el tooltip en body
          position: (point: number[], params: unknown, dom: HTMLElement, rect: TooltipRect, size: TooltipSize) =>
            this.tooltipPosition(point, params, dom, rect, size), // Posición custom
        },
        geo: {
          map: 'world',
          roam: true,                       // Permite zoom y desplazamiento
          zoom: 1.2,                        // Zoom inicial
          scaleLimit: { min: 1, max: 10 },  // Límites de zoom
          emphasis: { label: { show: false } }, // Sin etiquetas al resaltar
        },
        series: [
          {
            name: 'Mapa',
            type: 'map',
            geoIndex: 0,
            roam: true,
            data: [],                       // Se llenará cuando lleguen los datos
          },
        ],
      });

      // Solicita todas las observaciones al backend
      this.observationService.getAll().subscribe((observations: Observation[]) => {
        // Agrupa por país y se queda con la observación del año más reciente
        const grouped: { [key: string]: Observation } = {};
        observations.forEach((obs) => {
          if (!grouped[obs.countryName] || obs.timePeriod > grouped[obs.countryName].timePeriod) {
            grouped[obs.countryName] = obs;
          }
        });

        // Mapea a la estructura que ECharts espera para series de tipo map
        this.chartData = Object.values(grouped).map((obs) => ({
          name: obs.countryName,
          value: obs.obsValue,
          indicatorName: obs.indicatorName,
          timePeriod: obs.timePeriod,
          unitMeasure: obs.unitMeasure,
          sexLabel: obs.sexLabel,
          ageLabel: obs.ageLabel,
          urbanisationLabel: obs.urbanisationLabel,
        }));

        // Configura tooltip, escala de colores (visualMap) y asigna data
        this.chart.setOption({
          tooltip: {
            trigger: 'item',
            confine: true,
            appendToBody: true,
            position: (point: number[], params: unknown, dom: HTMLElement, rect: TooltipRect, size: TooltipSize) =>
              this.tooltipPosition(point, params, dom, rect, size),
            formatter: (params: any) => {
              // Texto del tooltip por país
              if (!params.data) return `${params.name}<br/>Sin datos`;
              const d = params.data;
              return `
                <strong>${params.name}</strong><br/>
                Valor: ${d.value ?? 'Sin datos'} ${d.unitMeasure ?? ''}<br/>
                Indicador: ${d.indicatorName ?? ''}<br/>
                Año: ${d.timePeriod ?? ''}<br/>
              `;
            },
          },
          visualMap: {
            min: 0,                         // Valor mínimo esperado
            max: 200,                       // Valor máximo esperado (ajustable)
            text: ['Alto', 'Bajo'],         // Etiquetas de la barra
            left: 'left',
            bottom: '10px',
            inRange: { color: ['#d4f1f9', '#1a0479ff'] }, // Gradiente de color
            calculable: true,               // Permite deslizar el control
          },
          series: [
            {
              name: 'Mapa',
              type: 'map',
              geoIndex: 0,
              roam: true,
              data: this.chartData,         // Datos agregados por país
            },
          ],
        });

        this.chart.hideLoading(); // Oculta el indicador de carga
        this.chart.resize();      // Ajusta a su contenedor
      });
      // Primer fetch de datos
      this.observationService.getAll().subscribe((observations: Observation[]) => {
        this.procesarDatos(observations);
      });
    });
  }

  // 🔍 Busca un país por nombre y lo resalta/abre tooltip
  buscarPais(event: any) {
    const nombre = (event?.target?.value ?? '').trim();
    if (!nombre) return;

    const pais = this.chartData.find((d) => d.name.toLowerCase() === nombre.toLowerCase());
    if (pais) {
      this.chart.dispatchAction({ type: 'highlight', name: pais.name }); // Resalta el país
      this.chart.dispatchAction({ type: 'showTip', name: pais.name });   // Muestra el tooltip del país
    } else {
      alert('País no encontrado'); // Mensaje si no coincide
    }
  }

  // Actualiza la data del mapa con una nueva lista de observaciones (p. ej. tras polling)
  private actualizarDatos(observations: Observation[]) {
    // Repite el agrupado por país conservando el año más reciente
    const grouped: { [key: string]: Observation } = {};
    observations.forEach((obs) => {
      if (!grouped[obs.countryName] || obs.timePeriod > grouped[obs.countryName].timePeriod) {
        grouped[obs.countryName] = obs;
      }
    });

    // Vuelve a construir la serie de datos para ECharts
    this.chartData = Object.values(grouped).map((obs) => ({
      name: obs.countryName,
      value: obs.obsValue,
      indicatorName: obs.indicatorName,
      timePeriod: obs.timePeriod,
      unitMeasure: obs.unitMeasure,
      sexLabel: obs.sexLabel,
      ageLabel: obs.ageLabel,
      urbanisationLabel: obs.urbanisationLabel,
    }));

    // Aplica los nuevos datos a la serie existente
    this.chart.setOption({
      series: [{ data: this.chartData }],
    });
    this.procesarDatos(observations);
  }
  // Procesar datos y decidir cuándo mostrar/ocultar el loading
  private procesarDatos(observations: Observation[]) {
    const grouped: { [key: string]: Observation } = {};
    observations.forEach((obs) => {
      if (!grouped[obs.countryName] || obs.timePeriod > grouped[obs.countryName].timePeriod) {
        grouped[obs.countryName] = obs;
      }
    });

    this.chartData = Object.values(grouped).map((obs) => ({
      name: obs.countryName,
      value: obs.obsValue,
      indicatorName: obs.indicatorName,
      timePeriod: obs.timePeriod,
      unitMeasure: obs.unitMeasure,
      sexLabel: obs.sexLabel,
      ageLabel: obs.ageLabel,
      urbanisationLabel: obs.urbanisationLabel,
    }));

    if (this.chartData.length === 0) {
      // ⚡ si sigue vacío → mostrar loading "Esperando datos..."
      this.chart.showLoading('default', {
        text: 'Esperando carga de datos... Por favor Espere',
        color: '#005f73',
      });
    } else {
      // ⚡ si ya llegaron datos → actualizar y ocultar loading
      this.chart.setOption({
        series: [{ data: this.chartData }],
      });
      this.chart.hideLoading();
      this.chart.resize();
    }
  }

}

