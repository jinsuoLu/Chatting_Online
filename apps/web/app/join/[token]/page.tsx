import { VisitorJoin } from '../../../components/visitor-join'; export default async function Page({params}:{params:Promise<{token:string}>}){return <VisitorJoin token={(await params).token}/>}
