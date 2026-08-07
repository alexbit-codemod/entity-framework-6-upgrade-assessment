using System.Data.Entity.Core.Objects;

namespace Sample
{
    public class Factory
    {
        public ObjectContext Create()
        {
            return null;
        }

        public void Accept(ObjectContext context)
        {
        }
    }
}
