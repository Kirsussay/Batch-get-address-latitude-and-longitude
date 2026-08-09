import { Vector as VectorLayer} from "ol/layer"
import { Vector as VectorSource } from "ol/source"
import { Feature } from "ol"
import { Point } from "ol/geom"
import { Style, Circle as CircleStyle, Fill, Stroke, Text } from "ol/style"
import { fromLonLat } from "ol/proj"


const defultCircleStyle = new Style(
    {
        image: new CircleStyle(
            {
                radius:8,
                fill:new Fill({color:'rgba(38,120,198,0.6)'}),
                stroke:new Stroke({color:'#2678c6',width:2})
            }
        )
    }
)

const highlightCircleStyle = new Style(
    {
        image: new CircleStyle(
            {
                radius:13,
                fill:new Fill({color:'rgba(236,72,153,0.8)'}),
                stroke:new Stroke({color:'#ec4899',width:3})
            }
        )
    }
)

export function useLabel()
{
    const labelSource = new VectorSource()
    const labelLayer = new VectorLayer({
        source:labelSource,
        style:defultCircleStyle,
        zIndex:10
    })

    let _map = null

    function labelMountToMap(mapInstance)
    {
        if(!mapInstance)return
        if(_map)
        {
            _map.removeLayer(labelLayer)
        }
        _map = mapInstance
        window._debugMap = _map
        if(!_map.getLayers().getArray().includes(labelLayer))
        {
            _map.addLayer(labelLayer)
        }
    }

    function addLabels(tips)
    {
        labelSource.clear()
        tips.forEach(tip => {
            if(!tip.location|| typeof tip.location !== 'string')return
            const [lon,lat] = tip.location.split(',').map(Number)
            const feature = new Feature({
                geometry:new Point(fromLonLat([lon,lat])),
                // name:tip.name,
                // address:tip.address
            })
            feature.setId(tip.id)
            labelSource.addFeature(feature)
        })
    }

    function highlightLabel(tipId){
        labelSource.getFeatures().forEach(f=>{
            f.setStyle(f.getId() === tipId ? highlightCircleStyle : defultCircleStyle)
        })
    }

    function clearLabel()
    {
        labelSource.clear()
    }

    return{labelMountToMap,addLabels,highlightLabel,clearLabel}
}
