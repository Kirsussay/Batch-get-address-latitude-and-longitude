import {ref} from 'vue'
import { GAODE_KEY } from '../config.js'



export function useGeoSearch()
{
    const _keyword = ref('')
    const _suggestions = ref([]) 
    const _Loading = ref(false)
    
    async function search(val)
    {
        _keyword.value = val || ''
        if (!_keyword.value) {
            _suggestions.value = []
            return
        }
    _Loading.value = true
    try{
        const url = 'https://restapi.amap.com/v3/assistant/inputtips'
        const params = new URLSearchParams({
            key : GAODE_KEY,
            keywords : _keyword.value,
        })
        const res = await fetch(`${url}?${params.toString()}`)
        const data = await res.json()
        console.log('获取地理数据:', data)
        console.log('获取地理数据:', data.tips)
        console.log('status:', data.status, 'tips长度:', data.tips?.length);
        if(data.status === '1' && data.tips.length > 0)
        {
            _suggestions.value = data.tips
        }
        else
        {
            _suggestions.value = []
        }
        
    }
    catch(e)
    {
        console.error('获取地理数据失败', e)
        _suggestions.value = []
    }
    finally
    {
        _Loading.value = false
    }
    }
    
    return{
        keyword:_keyword,
        suggestions:_suggestions,
        Loading:_Loading,
        search
    }

}