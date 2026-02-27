import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import QuestionCard from './QuestionCard';
import { useSessionBuilder } from '../store/useSessionBuilder';
import type { Question } from '../types/question';

export default function QuestionList({ questions }: { questions: Question[] }) {
  const { reorderQuestions } = useSessionBuilder();

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    reorderQuestions(result.source.index, result.destination.index);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="questions">
        {(provided: any) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {questions.map((q: Question, idx: number) => (
              <Draggable key={q.id} draggableId={String(q.id)} index={idx}>
                {(provided: any) => (
                  <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                    <QuestionCard question={q} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
