from pathlib import Path
import json
blog=json.loads(Path('content/blog.json').read_text(encoding='utf-8'))
translations=[[
'Construction and renovation advice','Renovations that can add value to your Laval home',
'Are you renovating to sell, or simply to make your home more comfortable? Several improvements can make a property more attractive and useful. Here are five projects to consider. Their financial return depends on the property, budget and local market.',
'Renovating your kitchen','A functional, modern kitchen can play an important role in how a home is perceived. Updating counters and cabinets can change its appearance, while new taps and well-planned lighting can make everyday tasks more enjoyable.',
'Renovating your bathroom','An unfinished or damaged bathroom may put buyers off. Focus on making it attractive and practical. A glass shower can create a feeling of space; a new bath, vanity, countertop or fittings can also refresh the room. Choose materials with suitable maintenance requirements.',
'Updating the flooring','Worn floors or dated carpeting can make a house feel tired. Neutral, durable finishes help create a consistent appearance. Laminate can offer a wood-like look at a lower cost, while vinyl is another option to compare. The right choice depends on the room and the intended use.',
'Adding a rental unit','Converting a floor or basement into a separate unit may create rental potential. Before planning the work, check feasibility, municipal requirements, project costs and the responsibilities involved. A higher property value or rental return is not guaranteed.',
'Refreshing the paint','A fresh coat of paint can brighten a property. Neutral colours are often easy to live with over time. Light colours can make a room feel more open, while deeper shades can add warmth. Repair surface imperfections before painting, and consider exterior finishes as part of the overall impression.',
'Discuss your renovation plans with MG Pro, serving Laval and Greater Montréal.'
],[
'Construction and renovation advice','Planning a home extension',
'Has your house become too small for your needs? If you have decided to explore an extension but are unsure where to begin, MG Pro can help you understand the main steps.',
'Municipal requirements','Requirements vary by municipality. Before detailed planning, check whether the proposed extension is feasible. Contact your municipality to discuss the project and any alternatives or restrictions that may apply.',
'Choosing your contractor','Once feasibility is established, choose a contractor and arrange the plans. Some general contractors offer both planning and construction services. Compare estimates based on the scope included. MG Pro works with architects on extension plans, allowing you to coordinate the main stages with one team.',
'An extension is a substantial project. A trusted general contractor coordinates the trades and subcontractors, manages the schedule and follows the work from planning to completion. Discuss your expectations and needs clearly before work begins.',
'Developing the plans','After discussing your needs, budget and ideas, your contractor can coordinate the design if this is included in the service. Otherwise, you will need to appoint the appropriate design professionals. Architects and architectural technologists prepare plans suited to the project and applicable requirements.',
'Getting the plans approved','Once the plans are complete and you approve the design, contact the municipality about the permits and supporting documents required. These may include signed plans, a detailed description of the work, a location certificate and a cost estimate. Confirm the current requirements for your own project.',
'Starting construction','When the required authorizations are in place, the general contractor and subcontractors can begin the extension.',
'With more than 20 years of construction and renovation experience, MG Pro handles home extensions, additional storeys, garages and additions in Laval and Montréal. Our team helps with planning and remains available throughout the project. Contact us for a free estimate.'
],[
'Construction and renovation advice','Designing offices for employee well-being in Laval',
'Office layout has an important effect on the people who work there. Employees often spend much of their week in the workplace, so a welcoming, bright and comfortable environment matters. Wall colours, furniture, heating, cooling and decoration all contribute to the experience. Plan for the practical needs of your team as well as the appearance of the space.',
'A general contractor can help assess the existing workspace, requirements and budget, coordinate a layout and carry out the work once the plans are approved.',
'There are several ways to organize your workspace.',
'Open-plan offices','Open spaces can encourage collaboration, conversation and the exchange of ideas on shared projects.',
'Enclosed offices','Enclosed rooms are useful for tasks that need concentration or privacy, such as important phone calls.',
'Hybrid layouts','Combining open areas with enclosed rooms gives employees a choice. Collaborative work can take place in shared areas, while quieter rooms support focused tasks away from noise.',
'Flexible workspaces','A flexible office has no permanently assigned desks. It may include open work areas, larger tables, relaxation space, private phone rooms and meeting rooms. Employees choose a setting according to the task and the day.',
'Before redesigning your offices, assess your employees’ needs, preferences and constraints. Choose a layout that supports their work and comfort over time.'
],[
'Construction and renovation advice','Why choose a general contractor for your renovation?',
'A renovation involves several skills. A bathroom alone can require electrical work, plumbing, demolition, painting, cabinets, countertops and flooring. Finding and coordinating each trade can take considerable time. A general contractor manages the work and coordinates qualified subcontractors, giving you a central point of contact for the project.',
'Check that your contractor holds the appropriate Régie du bâtiment du Québec (RBQ) licence for the planned work. A licence is one of the checks to make when selecting your team; it does not replace a clear contract, references or verification of insurance.',
'Discuss the work, responsibilities, insurance and applicable authorizations before construction starts. Licensed specialists should carry out work that requires their qualifications. Requirements and available protections depend on the project and circumstances.',
'A general contractor helps simplify the process and coordinate the stages of your renovation. Contact MG Pro to discuss your needs and obtain a free estimate.'
]]
for a,ts in zip(blog,translations):
 blocks=[b for b in a['blocks'] if b['type']!='image'];assert len(blocks)==len(ts),(a['slug'],len(blocks),len(ts))
 for b,t in zip(blocks,ts):b['text']=t
 for b in a['blocks']:
  if b['type']=='image':b['alt']='MG Pro renovation advice'
 a['title']=ts[1];a['description']=ts[2][:155]
Path('content/blog-en.json').write_text(json.dumps(blog,ensure_ascii=False,indent=2),encoding='utf-8')
